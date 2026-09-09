import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import { executeFirstContactAttemptCommand } from "../src/lib/crm-follow-up-command";
import { readFollowUpQueue } from "../src/lib/crm-follow-up";
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
  requestedVehicleIds: [],
  verifiedVehicleIds: [],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T05:00:00.000Z",
  sourceFetchedAt: "2026-09-09T04:59:00.000Z",
  sourceHash: "e".repeat(64),
};

function lead(email: string): LeadPayload {
  return {
    firstName: "Atomic",
    lastName: "Followup",
    email,
    phone: "4055550188",
    budgetRange: "$25,000-$35,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes: "evidence-bound first contact integration",
    source: "CI-Follow-Up-Command",
    trigger: "trapdoor",
    pipeline: "Vehicle Sourcing",
    shortlistedVehicleIds: [],
    monthlyTarget: 500,
    downPayment: 2500,
    termMonths: 60,
    consent: true,
  };
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for follow-up command integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);
  try {
    const submittedAt = "2026-09-09T06:00:00.000Z";
    const payload = lead("atomic-follow-up@example.com");
    const deskPrep = buildDeskPrepPacket({ lead: payload, inventoryEvidence, createdAt: submittedAt });
    const managerHandoff = createManagerHandoff({ deskPrep, createdAt: submittedAt });
    const persisted = await persistLeadAsCrmOpportunity({
      lead: payload,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter,
    });

    const evidenceRef = "sms-provider:message:ci-first-contact-001";
    const observedAt = "2026-09-09T06:04:00.000Z";
    const applied = await executeFirstContactAttemptCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: persisted.opportunityId,
      evidenceRef,
      authority: "NORAUTO_SYSTEM",
      observedAt,
    });

    assert(applied.status === "APPLIED", "First contact attempt must apply exactly once.");
    assert(applied.stage === "CONTACT_PENDING", "First contact attempt must move NEW to CONTACT_PENDING only.");
    assert(applied.authorityEffect === "FIRST_CONTACT_ATTEMPT_RECORDED_ONLY", "First contact attempt must not claim confirmed contact.");

    const state = await pool.query<{
      stage: string;
      satisfied_at: Date | null;
      satisfaction_evidence_ref: string | null;
      evidence_count: string;
      outbox_count: string;
    }>(
      `SELECT o.stage, f.satisfied_at, f.satisfaction_evidence_ref,
              (SELECT COUNT(*)::text FROM crm_evidence e
                WHERE e.workspace_id = o.workspace_id
                  AND e.opportunity_id = o.opportunity_id
                  AND e.kind = 'CONTACT_ATTEMPT'
                  AND e.evidence_ref = $3) AS evidence_count,
              (SELECT COUNT(*)::text FROM crm_outbox x
                WHERE x.workspace_id = o.workspace_id
                  AND x.aggregate_id = o.opportunity_id
                  AND x.event_type = 'CRM_OPPORTUNITY_STAGE_CHANGED'
                  AND x.payload->>'satisfactionEvidenceRef' = $3) AS outbox_count
         FROM crm_opportunities o
         JOIN crm_follow_up_obligations f
           ON f.workspace_id = o.workspace_id
          AND f.opportunity_id = o.opportunity_id
          AND f.obligation_type = 'FIRST_CONTACT'
        WHERE o.workspace_id = $1 AND o.opportunity_id = $2`,
      ["norautomatch", persisted.opportunityId, evidenceRef],
    );

    const row = state.rows[0];
    assert(row?.stage === "CONTACT_PENDING", "Durable stage must be CONTACT_PENDING after first contact attempt.");
    assert(row.satisfied_at?.toISOString() === observedAt, "Obligation satisfaction time must equal observed evidence time.");
    assert(row.satisfaction_evidence_ref === evidenceRef, "Obligation must bind to the exact append-only contact evidence reference.");
    assert(row.evidence_count === "1", "Contact-attempt evidence must be appended exactly once.");
    assert(row.outbox_count === "1", "Stage-change outbox event must commit atomically exactly once.");

    const queue = await readFollowUpQueue({
      pool,
      workspaceId: "norautomatch",
      now: "2026-09-09T06:20:00.000Z",
      limit: 100,
    });
    assert(!queue.some((item) => item.opportunityId === persisted.opportunityId), "Satisfied first-contact obligation must leave the actionable queue.");

    const deduplicated = await executeFirstContactAttemptCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: persisted.opportunityId,
      evidenceRef,
      authority: "NORAUTO_SYSTEM",
      observedAt,
    });
    assert(deduplicated.status === "DEDUPLICATED", "Exact first-contact replay must deduplicate.");

    const afterReplay = await pool.query<{ evidence_count: string; outbox_count: string }>(
      `SELECT
         (SELECT COUNT(*)::text FROM crm_evidence
           WHERE workspace_id = $1 AND opportunity_id = $2 AND kind = 'CONTACT_ATTEMPT') AS evidence_count,
         (SELECT COUNT(*)::text FROM crm_outbox
           WHERE workspace_id = $1 AND aggregate_id = $2 AND event_type = 'CRM_OPPORTUNITY_STAGE_CHANGED') AS outbox_count`,
      ["norautomatch", persisted.opportunityId],
    );
    assert(afterReplay.rows[0]?.evidence_count === "1", "Idempotent replay must not duplicate evidence.");
    assert(afterReplay.rows[0]?.outbox_count === "1", "Idempotent replay must not duplicate stage-change events.");

    let mismatchRejected = false;
    try {
      await executeFirstContactAttemptCommand({
        pool,
        workspaceId: "norautomatch",
        opportunityId: persisted.opportunityId,
        evidenceRef: "sms-provider:message:different-evidence",
        authority: "NORAUTO_SYSTEM",
        observedAt,
      });
    } catch {
      mismatchRejected = true;
    }
    assert(mismatchRejected, "Already-satisfied obligation must reject different evidence instead of rewriting history.");

    console.log("PASS_NODE_POSTGRES_EVIDENCE_BOUND_FIRST_CONTACT_COMMAND");
  } finally {
    await pool.end();
  }
}

run();
