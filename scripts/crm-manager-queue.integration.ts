import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { createCrmOpportunity } from "../src/lib/crm-core";
import { createOpportunityAtomicWrite } from "../src/lib/crm-outbox";
import { buildCrmPersistencePlan, executeCrmPersistencePlan } from "../src/lib/crm-persistence";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";
import { readPendingManagerQueue } from "../src/lib/crm-manager-queue";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN-QUEUE-1"],
  verifiedVehicleIds: ["VIN-QUEUE-1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T04:30:00.000Z",
  sourceFetchedAt: "2026-09-09T04:29:00.000Z",
  sourceHash: "d".repeat(64),
};

function lead(firstName: string, pipeline: LeadPayload["pipeline"]): LeadPayload {
  return {
    firstName,
    lastName: "Queue",
    email: `${firstName.toLowerCase()}@example.com`,
    phone: "4055550111",
    budgetRange: "$30,000-$35,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes: "manager queue integration",
    source: "CI-Manager-Queue",
    trigger: pipeline === "Vehicle Sourcing" ? "sourcing" : "retail",
    pipeline,
    shortlistedVehicleIds: ["VIN-QUEUE-1"],
    monthlyTarget: 525,
    downPayment: 3500,
    termMonths: 60,
    consent: true,
  };
}

function planFor(input: { lead: LeadPayload; createdAt: string; workspaceId?: string }) {
  const deskPrep = buildDeskPrepPacket({ lead: input.lead, inventoryEvidence, createdAt: input.createdAt });
  const handoff = createManagerHandoff({ deskPrep, createdAt: input.createdAt });
  const opportunity = createCrmOpportunity({
    lead: input.lead,
    inventoryEvidence,
    handoff,
    submittedAt: input.createdAt,
  });
  return buildCrmPersistencePlan({
    atomicWrite: createOpportunityAtomicWrite({ opportunity, occurredAt: input.createdAt }),
    managerHandoff: handoff,
    workspaceId: input.workspaceId,
  });
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for manager queue integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);

  try {
    const first = planFor({ lead: lead("Alpha", "Standard Retail"), createdAt: "2026-09-09T04:31:00.000Z" });
    const second = planFor({ lead: lead("Bravo", "Vehicle Sourcing"), createdAt: "2026-09-09T04:32:00.000Z" });
    const isolated = planFor({ lead: lead("Charlie", "Standard Retail"), createdAt: "2026-09-09T04:33:00.000Z", workspaceId: "other-workspace" });

    await executeCrmPersistencePlan({ adapter, plan: first });
    await executeCrmPersistencePlan({ adapter, plan: second });
    await executeCrmPersistencePlan({ adapter, plan: isolated });

    const queue = await readPendingManagerQueue({ pool, workspaceId: "norautomatch", limit: 25 });
    assert(queue.length === 2, "Manager queue must include only pending items from the requested workspace.");
    assert(queue[0].opportunityId === first.opportunity.opportunityId, "Manager queue must be FIFO by opportunity creation time.");
    assert(queue[1].opportunityId === second.opportunity.opportunityId, "Manager queue must preserve deterministic FIFO ordering.");
    assert(queue.every((item) => item.truthState === "READ_MODEL_ONLY"), "Manager queue must label itself as a read model.");
    assert(queue.every((item) => item.authorityEffect === "NONE"), "Reading manager queue must grant no authority.");
    assert(queue.every((item) => item.managerHandoff.authority.approveDeal === "NOT_AUTHORIZED"), "Queue must preserve handoff authority ceiling.");
    assert(queue[0].managerHandoff.handoffId === first.opportunity.latestHandoffId, "Queue must reconstruct the exact latest immutable manager handoff.");
    assert(queue[0].pipeline === "Standard Retail" && queue[1].pipeline === "Vehicle Sourcing", "Queue must preserve separate retail and sourcing pipelines.");

    const limited = await readPendingManagerQueue({ pool, workspaceId: "norautomatch", limit: 1 });
    assert(limited.length === 1 && limited[0].opportunityId === first.opportunity.opportunityId, "Manager queue limit must be bounded and deterministic.");

    const otherQueue = await readPendingManagerQueue({ pool, workspaceId: "other-workspace" });
    assert(otherQueue.length === 1 && otherQueue[0].opportunityId === isolated.opportunity.opportunityId, "Manager queue must enforce workspace isolation.");

    let blankRejected = false;
    try {
      await readPendingManagerQueue({ pool, workspaceId: "   " });
    } catch {
      blankRejected = true;
    }
    assert(blankRejected, "Manager queue must fail closed without explicit workspace identity.");

    console.log("PASS_POSTGRES_MANAGER_QUEUE_READ_MODEL");
  } finally {
    await pool.end();
  }
}

run();
