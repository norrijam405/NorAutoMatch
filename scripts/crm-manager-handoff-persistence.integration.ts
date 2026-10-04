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
  requestedVehicleIds: ["VIN-HANDOFF-1"],
  verifiedVehicleIds: ["VIN-HANDOFF-1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T04:10:00.000Z",
  sourceFetchedAt: "2026-09-09T04:09:00.000Z",
  sourceHash: "e".repeat(64),
};

const lead: LeadPayload = {
  firstName: "Manager",
  lastName: "Handoff",
  email: "manager-handoff@example.com",
  phone: "4055550177",
  budgetRange: "$35,000-$40,000",
  paymentMethod: "Financing",
  tradeIn: "2019 Rogue",
  notes: "durable desk packet test",
  source: "CI-Handoff-Persistence",
  trigger: "retail",
  pipeline: "Standard Retail",
  shortlistedVehicleIds: ["VIN-HANDOFF-1"],
  monthlyTarget: 625,
  downPayment: 5000,
  termMonths: 60,
  consent: true,
};

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for manager handoff integration test.");

  const submittedAt = "2026-09-09T04:11:00.000Z";
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
    assert(first.persistenceStatus === "COMMITTED", "Handoff integration intake must commit.");

    const rows = await pool.query<{
      handoff_id: string;
      handoff_idempotency_key: string;
      protocol: string;
      workflow_state: string;
      desk_prep: { protocol?: string; pipeline?: string; managerReviewRequired?: boolean };
      authority: { approveDeal?: string; changePrice?: string; approveFinancing?: string; valueTrade?: string };
    }>(
      `SELECT handoff_id, handoff_idempotency_key, protocol, workflow_state, desk_prep, authority
       FROM crm_manager_handoffs
       WHERE workspace_id = $1 AND opportunity_id = $2`,
      ["norautomatch", first.opportunityId],
    );

    assert(rows.rowCount === 1, "Lead intake must persist exactly one manager handoff packet.");
    const row = rows.rows[0];
    assert(row.handoff_id === managerHandoff.handoffId, "Persisted handoff must preserve exact handoff identity.");
    assert(row.handoff_idempotency_key === managerHandoff.idempotencyKey, "Persisted handoff must preserve deterministic idempotency key.");
    assert(row.protocol === "NORAUTO_MANAGER_HANDOFF_V1", "Persisted handoff must preserve protocol identity.");
    assert(row.workflow_state === "MANAGER_REVIEW_PENDING", "Persistence must not manufacture a manager decision.");
    assert(row.desk_prep.protocol === deskPrep.protocol, "Persisted handoff must preserve exact desk-prep protocol.");
    assert(row.desk_prep.pipeline === "Standard Retail", "Persisted handoff must preserve pipeline.");
    assert(row.desk_prep.managerReviewRequired === true, "Persisted handoff must preserve manager-review requirement.");
    assert(row.authority.approveDeal === "NOT_AUTHORIZED", "Persisted handoff must preserve no deal-approval authority.");
    assert(row.authority.changePrice === "NOT_AUTHORIZED", "Persisted handoff must preserve no price-change authority.");
    assert(row.authority.approveFinancing === "NOT_AUTHORIZED", "Persisted handoff must preserve no financing approval authority.");
    assert(row.authority.valueTrade === "NOT_AUTHORIZED", "Persisted handoff must preserve no trade valuation authority.");

    const retry = await persistLeadAsCrmOpportunity({
      lead,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter,
    });
    assert(retry.persistenceStatus === "DEDUPLICATED", "Exact retry must deduplicate before handoff duplication.");

    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_manager_handoffs WHERE opportunity_id = $1`,
      [first.opportunityId],
    );
    assert(Number(count.rows[0].count) === 1, "Retry must not duplicate manager handoff history.");

    let immutableRejected = false;
    try {
      await pool.query(`UPDATE crm_manager_handoffs SET workflow_state = 'MANAGER_REVIEW_PENDING' WHERE handoff_id = $1`, [managerHandoff.handoffId]);
    } catch {
      immutableRejected = true;
    }
    assert(immutableRejected, "Persisted manager handoff history must reject updates.");

    console.log("PASS_NODE_POSTGRES_MANAGER_HANDOFF_PERSISTENCE");
  } finally {
    await pool.end();
  }
}

run();
