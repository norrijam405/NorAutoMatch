import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { persistLeadAsCrmOpportunity } from "../src/lib/crm-lead-intake";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN-LEAD-INTAKE-1"],
  verifiedVehicleIds: ["VIN-LEAD-INTAKE-1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T04:00:00.000Z",
  sourceFetchedAt: "2026-09-09T03:59:00.000Z",
  sourceHash: "d".repeat(64),
};

const lead: LeadPayload = {
  firstName: "Lead",
  lastName: "Persistence",
  email: "lead-persistence@example.com",
  phone: "4055550188",
  budgetRange: "$25,000-$30,000",
  paymentMethod: "Financing",
  tradeIn: "",
  notes: "persist route intake before webhook side effects",
  source: "CI-Lead-Intake",
  trigger: "retail",
  pipeline: "Standard Retail",
  shortlistedVehicleIds: ["VIN-LEAD-INTAKE-1"],
  monthlyTarget: 475,
  downPayment: 3000,
  termMonths: 60,
  consent: true,
};

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for lead intake integration test.");

  const submittedAt = "2026-09-09T04:01:00.000Z";
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence, createdAt: submittedAt });
  const managerHandoff = createManagerHandoff({ deskPrep, createdAt: submittedAt });
  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);

  try {
    const first = await persistLeadAsCrmOpportunity({
      lead,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter,
    });

    assert(first.persistenceStatus === "COMMITTED", "Lead intake helper must commit first CRM opportunity write.");
    assert(first.stage === "NEW", "Lead intake must not manufacture customer contact progress.");
    assert(first.deskState === "MANAGER_REVIEW_PENDING", "Lead intake must preserve manager authority boundary.");
    assert(first.pipeline === "Standard Retail", "Lead intake must preserve exact pipeline.");

    const rows = await pool.query<{
      opportunity_id: string;
      intake_idempotency_key: string;
      pipeline: string;
      stage: string;
      desk_state: string;
      latest_handoff_id: string;
    }>(
      `SELECT opportunity_id, intake_idempotency_key, pipeline, stage, desk_state, latest_handoff_id
       FROM crm_opportunities WHERE opportunity_id = $1`,
      [first.opportunityId],
    );

    assert(rows.rowCount === 1, "Persisted lead must round-trip from PostgreSQL.");
    assert(rows.rows[0].intake_idempotency_key === first.intakeIdempotencyKey, "Round-trip must preserve intake idempotency key.");
    assert(rows.rows[0].pipeline === "Standard Retail", "Round-trip must preserve Standard Retail routing.");
    assert(rows.rows[0].stage === "NEW", "Database row must remain NEW after intake.");
    assert(rows.rows[0].desk_state === "MANAGER_REVIEW_PENDING", "Database row must remain manager-review pending.");
    assert(rows.rows[0].latest_handoff_id === managerHandoff.handoffId, "Database row must preserve manager handoff provenance.");

    const effects = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_outbox WHERE aggregate_id = $1 AND event_type = 'CRM_OPPORTUNITY_CREATED'`,
      [first.opportunityId],
    );
    assert(Number(effects.rows[0].count) === 1, "Lead intake must atomically create exactly one durable outbox effect.");

    const retry = await persistLeadAsCrmOpportunity({
      lead,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter,
    });
    assert(retry.persistenceStatus === "DEDUPLICATED", "Exact lead intake retry must deduplicate.");
    assert(retry.opportunityId === first.opportunityId, "Exact lead intake retry must preserve opportunity identity.");

    const postRetry = await pool.query<{ opportunities: string; effects: string }>(
      `SELECT
        (SELECT count(*) FROM crm_opportunities WHERE opportunity_id = $1)::text AS opportunities,
        (SELECT count(*) FROM crm_outbox WHERE aggregate_id = $1)::text AS effects`,
      [first.opportunityId],
    );
    assert(Number(postRetry.rows[0].opportunities) === 1, "Retry must not duplicate the opportunity.");
    assert(Number(postRetry.rows[0].effects) === 1, "Retry must not duplicate the outbox effect.");

    console.log("PASS_NODE_POSTGRES_LEAD_INTAKE_PERSISTENCE");
  } finally {
    await pool.end();
  }
}

run();
