import fs from "node:fs";
import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { createCrmOpportunity, advanceCrmOpportunity } from "../src/lib/crm-core";
import { createOpportunityAtomicWrite } from "../src/lib/crm-outbox";
import {
  buildCrmPersistencePlan,
  executeCrmPersistencePlan,
  type CrmPersistenceAdapter,
  type CrmPersistenceTransaction,
  type PersistedEvidenceRow,
  type PersistedManagerReceiptRow,
  type PersistedOpportunityRow,
  type PersistedOutboxRow,
} from "../src/lib/crm-persistence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectThrow(fn: () => unknown, message: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const lead: LeadPayload = {
  firstName: "Norris",
  lastName: "Buyer",
  email: "buyer@example.com",
  phone: "4055550101",
  budgetRange: "$30,000-$35,000",
  paymentMethod: "Financing",
  tradeIn: "",
  notes: "CRM persistence test",
  source: "Website",
  trigger: "retail",
  pipeline: "Standard Retail",
  shortlistedVehicleIds: ["VIN1"],
  monthlyTarget: 550,
  downPayment: 4000,
  termMonths: 60,
  consent: true,
};

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN1"],
  verifiedVehicleIds: ["VIN1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T02:00:00.000Z",
  sourceFetchedAt: "2026-09-09T01:59:00.000Z",
  sourceHash: "b".repeat(64),
};

function makeOpportunity() {
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence, createdAt: "2026-09-09T03:00:00.000Z" });
  const handoff = createManagerHandoff({ deskPrep, createdAt: "2026-09-09T03:00:00.000Z" });
  return createCrmOpportunity({ lead, inventoryEvidence, handoff, submittedAt: "2026-09-09T03:00:00.000Z" });
}

type State = {
  opportunities: PersistedOpportunityRow[];
  evidence: PersistedEvidenceRow[];
  receipts: PersistedManagerReceiptRow[];
  outbox: PersistedOutboxRow[];
};

class FakeAtomicAdapter implements CrmPersistenceAdapter {
  state: State = { opportunities: [], evidence: [], receipts: [], outbox: [] };
  failOutbox = false;

  async runAtomic<T>(operation: (transaction: CrmPersistenceTransaction) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.state);
    const transaction: CrmPersistenceTransaction = {
      insertOpportunity: async (row) => {
        const existing = this.state.opportunities.find((candidate) => candidate.intakeIdempotencyKey === row.intakeIdempotencyKey);
        if (existing) return "ALREADY_EXISTS_SAME_IDEMPOTENCY_KEY";
        this.state.opportunities.push(row);
        return "INSERTED";
      },
      insertEvidence: async (rows) => {
        this.state.evidence.push(...rows);
      },
      insertManagerReceipts: async (rows) => {
        this.state.receipts.push(...rows);
      },
      insertOutbox: async (rows) => {
        if (this.failOutbox) throw new Error("synthetic outbox failure");
        this.state.outbox.push(...rows);
      },
    };

    try {
      return await operation(transaction);
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }
}

async function expectReject(fn: () => Promise<unknown>, message: string) {
  let rejected = false;
  try {
    await fn();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

async function run() {
  const opportunity = makeOpportunity();
  const atomicWrite = createOpportunityAtomicWrite({ opportunity });
  const plan = buildCrmPersistencePlan({ atomicWrite });

  assert(plan.workspaceId === "norautomatch", "Default persistence plan must preserve explicit NorAutoMatch workspace boundary.");
  assert(plan.transactionInvariant === "ALL_ROWS_COMMIT_TOGETHER_OR_NONE_COMMIT", "Persistence plan must preserve all-or-nothing transaction invariant.");
  assert(plan.opportunity.pipeline === "Standard Retail", "Persistence mapping must preserve pipeline exactly.");
  assert(plan.evidence.length === opportunity.evidence.length, "Persistence plan must preserve all opportunity evidence rows.");
  assert(plan.outbox.length === 1, "Creation persistence plan must preserve the creation outbox event.");

  expectThrow(
    () => buildCrmPersistencePlan({ atomicWrite, workspaceId: "   " }),
    "Persistence must fail closed without a workspace identity.",
  );

  const adapter = new FakeAtomicAdapter();
  const committed = await executeCrmPersistencePlan({ adapter, plan });
  assert(committed.status === "COMMITTED", "First opportunity intake must commit.");
  assert(adapter.state.opportunities.length === 1, "Committed intake must persist one opportunity.");
  assert(adapter.state.evidence.length === plan.evidence.length, "Committed intake must persist evidence atomically.");
  assert(adapter.state.outbox.length === 1, "Committed intake must persist outbox atomically.");

  const deduplicated = await executeCrmPersistencePlan({ adapter, plan });
  assert(deduplicated.status === "DEDUPLICATED", "Same intake idempotency key must deduplicate.");
  assert(adapter.state.opportunities.length === 1, "Deduplicated retry must not create another opportunity.");
  assert(adapter.state.evidence.length === plan.evidence.length, "Deduplicated retry must not duplicate evidence.");
  assert(adapter.state.outbox.length === 1, "Deduplicated retry must not duplicate outbox events.");

  const rollbackAdapter = new FakeAtomicAdapter();
  rollbackAdapter.failOutbox = true;
  await expectReject(
    () => executeCrmPersistencePlan({ adapter: rollbackAdapter, plan }),
    "Outbox failure must reject the entire atomic persistence operation.",
  );
  assert(rollbackAdapter.state.opportunities.length === 0, "Outbox failure must roll back opportunity persistence.");
  assert(rollbackAdapter.state.evidence.length === 0, "Outbox failure must roll back evidence persistence.");
  assert(rollbackAdapter.state.outbox.length === 0, "Outbox failure must leave no partial outbox state.");

  const contactPending = advanceCrmOpportunity({ opportunity, to: "CONTACT_PENDING", actor: "NORAUTO_SYSTEM", observedAt: "2026-09-09T03:01:00.000Z" });
  const contacted = advanceCrmOpportunity({
    opportunity: contactPending,
    to: "CONTACTED",
    actor: "MANAGER",
    evidence: { kind: "CONTACT_CONFIRMED", ref: "contact-1", observedAt: "2026-09-09T03:02:00.000Z", authority: "MANAGER" },
  });
  const appointment = advanceCrmOpportunity({
    opportunity: contacted,
    to: "APPOINTMENT_SET",
    actor: "MANAGER",
    evidence: { kind: "APPOINTMENT_CONFIRMED", ref: "appt-1", observedAt: "2026-09-09T03:03:00.000Z", authority: "MANAGER" },
  });
  const sold = advanceCrmOpportunity({
    opportunity: appointment,
    to: "SOLD",
    actor: "DEALERSHIP_SYSTEM",
    evidence: { kind: "DEALERSHIP_SOLD_OUTCOME", ref: "sold-proof-1", observedAt: "2026-09-09T03:04:00.000Z", authority: "DEALERSHIP_SYSTEM" },
  });
  const soldPlan = buildCrmPersistencePlan({ atomicWrite: createOpportunityAtomicWrite({ opportunity: sold }) });
  assert(soldPlan.opportunity.outcomeType === "SOLD", "Terminal sold persistence must preserve outcome type.");
  assert(soldPlan.opportunity.outcomeEvidenceRef === "sold-proof-1", "Terminal sold persistence must preserve exact evidence reference.");

  const schema = fs.readFileSync("infrastructure/norautomatch-crm-v1.sql", "utf8");
  const requiredSchemaFragments = [
    "intake_idempotency_key CHAR(64) NOT NULL UNIQUE",
    "pipeline IN ('Standard Retail', 'Vehicle Sourcing')",
    "crm_terminal_outcome_consistency",
    "outcome_evidence_ref IS NOT NULL",
    "crm_evidence_immutable_update",
    "crm_manager_receipt_immutable_update",
    "event_idempotency_key CHAR(64) NOT NULL UNIQUE",
    "delivery_state IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')",
    "OPPORTUNITY_AND_OUTBOX",
  ];
  for (const fragment of requiredSchemaFragments) {
    assert(schema.includes(fragment), `CRM schema is missing required invariant: ${fragment}`);
  }

  assert(!schema.includes("ON DELETE CASCADE"), "CRM evidence lineage must not disappear through cascading deletes.");

  console.log("PASS CRM persistence mapping, dedupe, rollback, workspace, evidence, and schema invariants");
}

run();
