import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import { executeContactConfirmationCommand } from "../src/lib/crm-contact-confirmation-command";
import { executeFirstContactAttemptCommand } from "../src/lib/crm-follow-up-command";
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
  catalogGeneratedAt: "2026-09-09T06:00:00.000Z",
  sourceFetchedAt: "2026-09-09T05:59:00.000Z",
  sourceHash: "c".repeat(64),
};

const lead: LeadPayload = {
  firstName: "Confirmed",
  lastName: "Customer",
  email: "confirmed-contact@example.com",
  phone: "4055550123",
  budgetRange: "$25,000-$35,000",
  paymentMethod: "Financing",
  tradeIn: "",
  notes: "confirmed contact integration",
  source: "CI-Contact-Confirmation",
  trigger: "trapdoor",
  pipeline: "Vehicle Sourcing",
  shortlistedVehicleIds: [],
  monthlyTarget: 500,
  downPayment: 2500,
  termMonths: 60,
  consent: true,
};

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for contact confirmation integration test.");
  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);

  try {
    const submittedAt = "2026-09-09T06:00:00.000Z";
    const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence, createdAt: submittedAt });
    const managerHandoff = createManagerHandoff({ deskPrep, createdAt: submittedAt });
    const persisted = await persistLeadAsCrmOpportunity({
      lead,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter,
    });

    const attemptEvidenceRef = "sms-provider:message:attempt-before-confirmation";
    const attemptObservedAt = "2026-09-09T06:03:00.000Z";
    await executeFirstContactAttemptCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: persisted.opportunityId,
      evidenceRef: attemptEvidenceRef,
      authority: "NORAUTO_SYSTEM",
      observedAt: attemptObservedAt,
    });

    const evidenceRef = "sms-provider:conversation:customer-replied-001";
    const observedAt = "2026-09-09T06:05:00.000Z";
    const applied = await executeContactConfirmationCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: persisted.opportunityId,
      evidenceRef,
      authority: "MANAGER",
      observedAt,
    });
    assert(applied.status === "APPLIED", "Confirmed contact must apply exactly once.");
    assert(applied.stage === "CONTACTED", "Confirmed-contact evidence must advance CONTACT_PENDING to CONTACTED.");

    const durable = await pool.query<{ stage: string; evidence_count: string; outbox_count: string }>(
      `SELECT o.stage,
              (SELECT COUNT(*)::text FROM crm_evidence e
                WHERE e.workspace_id = o.workspace_id AND e.opportunity_id = o.opportunity_id
                  AND e.kind = 'CONTACT_CONFIRMED' AND e.evidence_ref = $3) AS evidence_count,
              (SELECT COUNT(*)::text FROM crm_outbox x
                WHERE x.workspace_id = o.workspace_id AND x.aggregate_id = o.opportunity_id
                  AND x.event_type = 'CRM_OPPORTUNITY_STAGE_CHANGED'
                  AND x.payload->>'evidenceRef' = $3) AS outbox_count
         FROM crm_opportunities o
        WHERE o.workspace_id = $1 AND o.opportunity_id = $2`,
      ["norautomatch", persisted.opportunityId, evidenceRef],
    );
    assert(durable.rows[0]?.stage === "CONTACTED", "Durable opportunity must be CONTACTED after confirmed contact.");
    assert(durable.rows[0]?.evidence_count === "1", "Confirmed-contact evidence must be appended exactly once.");
    assert(durable.rows[0]?.outbox_count === "1", "Confirmed-contact stage event must be emitted exactly once.");

    const delayedAttemptReplay = await executeFirstContactAttemptCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: persisted.opportunityId,
      evidenceRef: attemptEvidenceRef,
      authority: "NORAUTO_SYSTEM",
      observedAt: attemptObservedAt,
    });
    assert(delayedAttemptReplay.status === "DEDUPLICATED", "Delayed first-contact replay must remain idempotent after later valid progression.");
    assert(delayedAttemptReplay.stage === "CONTACTED", "Delayed first-contact replay must preserve the later CONTACTED stage.");

    const replay = await executeContactConfirmationCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: persisted.opportunityId,
      evidenceRef,
      authority: "MANAGER",
      observedAt,
    });
    assert(replay.status === "DEDUPLICATED", "Exact confirmed-contact replay must deduplicate after stage advancement.");
    assert(replay.stage === "CONTACTED", "Deduplicated confirmation must report durable CONTACTED stage.");

    let secondConfirmationRejected = false;
    try {
      await executeContactConfirmationCommand({
        pool,
        workspaceId: "norautomatch",
        opportunityId: persisted.opportunityId,
        evidenceRef: "sms-provider:conversation:different-confirmation",
        authority: "MANAGER",
        observedAt: "2026-09-09T06:06:00.000Z",
      });
    } catch {
      secondConfirmationRejected = true;
    }
    assert(secondConfirmationRejected, "A second unrelated confirmation must not rewrite contact history.");

    console.log("PASS_NODE_POSTGRES_EVIDENCE_GATED_CONTACT_CONFIRMATION");
  } finally {
    await pool.end();
  }
}

run();
