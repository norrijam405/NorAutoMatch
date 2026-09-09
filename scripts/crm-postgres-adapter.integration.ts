import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { createCrmOpportunity } from "../src/lib/crm-core";
import { createOpportunityAtomicWrite } from "../src/lib/crm-outbox";
import { buildCrmPersistencePlan, executeCrmPersistencePlan } from "../src/lib/crm-persistence";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN-PG-1"],
  verifiedVehicleIds: ["VIN-PG-1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T03:40:00.000Z",
  sourceFetchedAt: "2026-09-09T03:39:00.000Z",
  sourceHash: "c".repeat(64),
};

function buildLead(notes: string): LeadPayload {
  return {
    firstName: "Postgres",
    lastName: "Roundtrip",
    email: "postgres-roundtrip@example.com",
    phone: "4055550199",
    budgetRange: "$30,000-$35,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes,
    source: "CI-Postgres-Adapter",
    trigger: "retail",
    pipeline: "Standard Retail",
    shortlistedVehicleIds: ["VIN-PG-1"],
    monthlyTarget: 550,
    downPayment: 4000,
    termMonths: 60,
    consent: true,
  };
}

function makePlan(lead: LeadPayload, createdAt: string) {
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence, createdAt });
  const handoff = createManagerHandoff({ deskPrep, createdAt });
  const opportunity = createCrmOpportunity({
    lead,
    inventoryEvidence,
    handoff,
    submittedAt: createdAt,
    attribution: { source: lead.source, campaign: "pg-adapter-integration", medium: "ci" },
  });
  return buildCrmPersistencePlan({ atomicWrite: createOpportunityAtomicWrite({ opportunity }) });
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for Postgres adapter integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);

  try {
    const plan = makePlan(buildLead("real adapter commit path"), "2026-09-09T03:45:00.000Z");
    const first = await executeCrmPersistencePlan({ adapter, plan });
    assert(first.status === "COMMITTED", "Real Postgres adapter must commit first opportunity intake.");

    const opportunityRow = await pool.query<{
      opportunity_id: string;
      workspace_id: string;
      pipeline: string;
      stage: string;
      latest_handoff_id: string;
    }>(
      `SELECT opportunity_id, workspace_id, pipeline, stage, latest_handoff_id
       FROM crm_opportunities WHERE opportunity_id = $1`,
      [plan.opportunity.opportunityId],
    );
    assert(opportunityRow.rowCount === 1, "Committed opportunity must round-trip from PostgreSQL.");
    assert(opportunityRow.rows[0].workspace_id === "norautomatch", "Round-trip must preserve workspace boundary.");
    assert(opportunityRow.rows[0].pipeline === "Standard Retail", "Round-trip must preserve exact CRM pipeline.");
    assert(opportunityRow.rows[0].stage === "NEW", "Round-trip must not manufacture CRM progress.");
    assert(opportunityRow.rows[0].latest_handoff_id === plan.opportunity.latestHandoffId, "Round-trip must preserve handoff provenance.");

    const evidenceCount = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_evidence WHERE workspace_id = $1 AND opportunity_id = $2`,
      [plan.workspaceId, plan.opportunity.opportunityId],
    );
    assert(Number(evidenceCount.rows[0].count) === plan.evidence.length, "Real adapter must persist the complete evidence set.");

    const outboxRows = await pool.query<{
      event_id: string;
      event_idempotency_key: string;
      delivery_state: string;
      attempts: number;
    }>(
      `SELECT event_id, event_idempotency_key, delivery_state, attempts
       FROM crm_outbox WHERE workspace_id = $1 AND aggregate_id = $2`,
      [plan.workspaceId, plan.opportunity.opportunityId],
    );
    assert(outboxRows.rowCount === plan.outbox.length, "Real adapter must persist outbox rows atomically with opportunity.");
    assert(outboxRows.rows[0].event_id === plan.outbox[0].event.eventId, "Outbox round-trip must preserve deterministic event identity.");
    assert(outboxRows.rows[0].event_idempotency_key === plan.outbox[0].event.idempotencyKey, "Outbox round-trip must preserve consumer dedupe key.");
    assert(outboxRows.rows[0].delivery_state === "PENDING" && outboxRows.rows[0].attempts === 0, "New outbox effect must remain pending and unattempted.");

    const retry = await executeCrmPersistencePlan({ adapter, plan });
    assert(retry.status === "DEDUPLICATED", "Real Postgres adapter must deduplicate same intake retry.");

    const postRetry = await pool.query<{ opportunities: string; evidence: string; outbox: string }>(
      `SELECT
        (SELECT count(*) FROM crm_opportunities WHERE opportunity_id = $1)::text AS opportunities,
        (SELECT count(*) FROM crm_evidence WHERE opportunity_id = $1)::text AS evidence,
        (SELECT count(*) FROM crm_outbox WHERE aggregate_id = $1)::text AS outbox`,
      [plan.opportunity.opportunityId],
    );
    assert(Number(postRetry.rows[0].opportunities) === 1, "Retry must not duplicate opportunity row.");
    assert(Number(postRetry.rows[0].evidence) === plan.evidence.length, "Retry must not duplicate evidence rows.");
    assert(Number(postRetry.rows[0].outbox) === plan.outbox.length, "Retry must not duplicate outbox rows.");

    const rollbackPlan = makePlan(buildLead("real adapter rollback path"), "2026-09-09T03:46:00.000Z");
    const brokenPlan = {
      ...rollbackPlan,
      outbox: rollbackPlan.outbox.map((row, index) => index === 0
        ? {
            ...row,
            event: {
              ...row.event,
              aggregateId: "namo_ffffffffffffffffffffffff",
            },
          }
        : row),
    };

    let rollbackObserved = false;
    try {
      await executeCrmPersistencePlan({ adapter, plan: brokenPlan });
    } catch {
      rollbackObserved = true;
    }
    assert(rollbackObserved, "Foreign-key failure must reject real adapter transaction.");

    const rollbackState = await pool.query<{ opportunities: string; evidence: string }>(
      `SELECT
        (SELECT count(*) FROM crm_opportunities WHERE opportunity_id = $1)::text AS opportunities,
        (SELECT count(*) FROM crm_evidence WHERE opportunity_id = $1)::text AS evidence`,
      [rollbackPlan.opportunity.opportunityId],
    );
    assert(Number(rollbackState.rows[0].opportunities) === 0, "Failed real transaction must roll back opportunity row.");
    assert(Number(rollbackState.rows[0].evidence) === 0, "Failed real transaction must roll back evidence rows.");

    console.log("PASS_NODE_POSTGRES_CRM_ADAPTER_ROUNDTRIP");
  } finally {
    await pool.end();
  }
}

run();
