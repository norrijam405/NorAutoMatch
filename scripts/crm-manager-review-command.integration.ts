import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { createCrmOpportunity } from "../src/lib/crm-core";
import { createOpportunityAtomicWrite } from "../src/lib/crm-outbox";
import { buildCrmPersistencePlan, executeCrmPersistencePlan } from "../src/lib/crm-persistence";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";
import { executeManagerReviewCommand } from "../src/lib/crm-manager-review-command";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const WORKSPACE = "manager-review-command-ci";
const OTHER_WORKSPACE = "manager-review-command-other-ci";

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN-REVIEW-1"],
  verifiedVehicleIds: ["VIN-REVIEW-1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T05:15:00.000Z",
  sourceFetchedAt: "2026-09-09T05:14:00.000Z",
  sourceHash: "e".repeat(64),
};

function lead(firstName: string): LeadPayload {
  return {
    firstName,
    lastName: "Review",
    email: `${firstName.toLowerCase()}@example.com`,
    phone: "4055550133",
    budgetRange: "$35,000-$40,000",
    paymentMethod: "Financing",
    tradeIn: "2019 sedan",
    notes: "manager review command integration",
    source: "CI-Manager-Review",
    trigger: "retail",
    pipeline: "Standard Retail",
    shortlistedVehicleIds: ["VIN-REVIEW-1"],
    monthlyTarget: 600,
    downPayment: 5000,
    termMonths: 60,
    consent: true,
  };
}

function makePlan(firstName: string, createdAt: string, workspaceId = WORKSPACE) {
  const payload = lead(firstName);
  const deskPrep = buildDeskPrepPacket({ lead: payload, inventoryEvidence, createdAt });
  const handoff = createManagerHandoff({ deskPrep, createdAt });
  const opportunity = createCrmOpportunity({ lead: payload, inventoryEvidence, handoff, submittedAt: createdAt });
  return buildCrmPersistencePlan({
    atomicWrite: createOpportunityAtomicWrite({ opportunity, occurredAt: createdAt }),
    managerHandoff: handoff,
    workspaceId,
  });
}

const verifiedActor = {
  state: "VERIFIED" as const,
  subjectId: "manager-ci-001",
  verifier: "CI_AUTH_FIXTURE",
  verifiedAt: "2026-09-09T05:20:00.000Z",
  evidenceRef: "auth-proof-ci-001",
};

async function counts(pool: ReturnType<typeof createPostgresCrmPool>, opportunityId: string) {
  const result = await pool.query<{
    receipts: string;
    events: string;
    desk_state: string;
    latest_manager_receipt_id: string | null;
  }>(
    `SELECT
       (SELECT count(*) FROM crm_manager_review_receipts WHERE opportunity_id = $1)::text AS receipts,
       (SELECT count(*) FROM crm_outbox WHERE aggregate_id = $1 AND event_type = 'CRM_MANAGER_REVIEW_APPLIED')::text AS events,
       desk_state,
       latest_manager_receipt_id
     FROM crm_opportunities WHERE opportunity_id = $1`,
    [opportunityId],
  );
  return result.rows[0];
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for manager review command integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);

  try {
    const primary = makePlan("Alpha", "2026-09-09T05:21:00.000Z");
    await executeCrmPersistencePlan({ adapter, plan: primary });

    const rejected = await executeManagerReviewCommand({
      pool,
      workspaceId: WORKSPACE,
      opportunityId: primary.opportunity.opportunityId,
      expectedHandoffId: primary.opportunity.latestHandoffId,
      decision: "ACKNOWLEDGED",
      actor: { state: "UNVERIFIED", subjectId: "claimed-manager", verifier: "NONE" },
      recordedAt: "2026-09-09T05:22:00.000Z",
    });
    assert(rejected.status === "REJECTED" && rejected.authorityEffect === "NONE", "Unverified manager actor must be rejected without authority effect.");
    let state = await counts(pool, primary.opportunity.opportunityId);
    assert(Number(state.receipts) === 0 && Number(state.events) === 0, "Rejected manager action must persist no receipt or review outbox event.");
    assert(state.desk_state === "MANAGER_REVIEW_PENDING" && state.latest_manager_receipt_id === null, "Rejected manager action must not mutate opportunity desk state.");

    let staleRejected = false;
    try {
      await executeManagerReviewCommand({
        pool,
        workspaceId: WORKSPACE,
        opportunityId: primary.opportunity.opportunityId,
        expectedHandoffId: "namh_ffffffffffffffffffffffff",
        decision: "ACKNOWLEDGED",
        actor: verifiedActor,
        recordedAt: "2026-09-09T05:23:00.000Z",
      });
    } catch {
      staleRejected = true;
    }
    assert(staleRejected, "Manager review command must reject stale handoff identity.");

    let crossWorkspaceRejected = false;
    try {
      await executeManagerReviewCommand({
        pool,
        workspaceId: OTHER_WORKSPACE,
        opportunityId: primary.opportunity.opportunityId,
        expectedHandoffId: primary.opportunity.latestHandoffId,
        decision: "ACKNOWLEDGED",
        actor: verifiedActor,
        recordedAt: "2026-09-09T05:23:30.000Z",
      });
    } catch {
      crossWorkspaceRejected = true;
    }
    assert(crossWorkspaceRejected, "Manager review command must reject cross-workspace opportunity access.");

    const applied = await executeManagerReviewCommand({
      pool,
      workspaceId: WORKSPACE,
      opportunityId: primary.opportunity.opportunityId,
      expectedHandoffId: primary.opportunity.latestHandoffId,
      decision: "ACKNOWLEDGED",
      actor: verifiedActor,
      note: "reviewed in CI",
      recordedAt: "2026-09-09T05:24:00.000Z",
    });
    assert(applied.status === "APPLIED", "Verified manager review must atomically apply.");
    assert(applied.deskState === "MANAGER_ACKNOWLEDGED", "Acknowledgement must update only manager desk state.");
    assert(applied.authorityEffect === "HANDOFF_REVIEW_ONLY", "Manager review must not grant deal approval authority.");

    state = await counts(pool, primary.opportunity.opportunityId);
    assert(Number(state.receipts) === 1 && Number(state.events) === 1, "Applied manager review must persist one receipt and one outbox event.");
    assert(state.desk_state === "MANAGER_ACKNOWLEDGED" && state.latest_manager_receipt_id === applied.receiptId, "Applied manager review must persist exact receipt linkage.");

    const retry = await executeManagerReviewCommand({
      pool,
      workspaceId: WORKSPACE,
      opportunityId: primary.opportunity.opportunityId,
      expectedHandoffId: primary.opportunity.latestHandoffId,
      decision: "ACKNOWLEDGED",
      actor: verifiedActor,
      note: "retry should dedupe",
      recordedAt: "2026-09-09T05:25:00.000Z",
    });
    assert(retry.status === "DEDUPLICATED" && retry.receiptId === applied.receiptId, "Same verified manager action must deterministically deduplicate.");
    state = await counts(pool, primary.opportunity.opportunityId);
    assert(Number(state.receipts) === 1 && Number(state.events) === 1, "Deduplicated manager retry must not duplicate receipt or outbox event.");

    const clarification = makePlan("Bravo", "2026-09-09T05:26:00.000Z");
    await executeCrmPersistencePlan({ adapter, plan: clarification });
    const returned = await executeManagerReviewCommand({
      pool,
      workspaceId: WORKSPACE,
      opportunityId: clarification.opportunity.opportunityId,
      expectedHandoffId: clarification.opportunity.latestHandoffId,
      decision: "RETURNED_FOR_CLARIFICATION",
      actor: verifiedActor,
      recordedAt: "2026-09-09T05:27:00.000Z",
    });
    assert(returned.status === "APPLIED" && returned.deskState === "RETURNED_FOR_CLARIFICATION", "Clarification decision must preserve its distinct desk state.");

    const rollbackPlan = makePlan("Charlie", "2026-09-09T05:28:00.000Z");
    await executeCrmPersistencePlan({ adapter, plan: rollbackPlan });

    await pool.query(`
      CREATE OR REPLACE FUNCTION norauto_ci_reject_manager_review_outbox()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.event_type = 'CRM_MANAGER_REVIEW_APPLIED' THEN
          RAISE EXCEPTION 'synthetic manager review outbox failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS norauto_ci_manager_review_outbox_failure ON crm_outbox;
      CREATE TRIGGER norauto_ci_manager_review_outbox_failure
      BEFORE INSERT ON crm_outbox
      FOR EACH ROW EXECUTE FUNCTION norauto_ci_reject_manager_review_outbox();
    `);

    let rollbackObserved = false;
    try {
      await executeManagerReviewCommand({
        pool,
        workspaceId: WORKSPACE,
        opportunityId: rollbackPlan.opportunity.opportunityId,
        expectedHandoffId: rollbackPlan.opportunity.latestHandoffId,
        decision: "ACKNOWLEDGED",
        actor: verifiedActor,
        recordedAt: "2026-09-09T05:29:00.000Z",
      });
    } catch {
      rollbackObserved = true;
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS norauto_ci_manager_review_outbox_failure ON crm_outbox; DROP FUNCTION IF EXISTS norauto_ci_reject_manager_review_outbox();`);
    }
    assert(rollbackObserved, "Synthetic review outbox failure must reject manager review transaction.");
    state = await counts(pool, rollbackPlan.opportunity.opportunityId);
    assert(Number(state.receipts) === 0 && Number(state.events) === 0, "Outbox failure must roll back manager receipt and review event.");
    assert(state.desk_state === "MANAGER_REVIEW_PENDING" && state.latest_manager_receipt_id === null, "Outbox failure must roll back opportunity desk mutation.");

    console.log("PASS_POSTGRES_ATOMIC_MANAGER_REVIEW_COMMAND");
  } finally {
    await pool.end();
  }
}

run();
