import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import { readAppointmentConfirmationQueue } from "../src/lib/crm-appointment-queue";
import { executeContactConfirmationCommand } from "../src/lib/crm-contact-confirmation-command";
import { executeFirstContactAttemptCommand } from "../src/lib/crm-follow-up-command";
import { executeAppointmentConfirmationCommand, executeOutcomeCommand } from "../src/lib/crm-sales-progression-command";
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
  catalogGeneratedAt: "2026-09-09T07:00:00.000Z",
  sourceFetchedAt: "2026-09-09T06:59:00.000Z",
  sourceHash: "b".repeat(64),
};

function makeLead(email: string): LeadPayload {
  return {
    firstName: "Outcome",
    lastName: "Tester",
    email,
    phone: "4055550144",
    budgetRange: "$25,000-$35,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes: "appointment/outcome integration",
    source: "CI-Sales-Progression",
    trigger: "trapdoor",
    pipeline: "Vehicle Sourcing",
    shortlistedVehicleIds: [],
    monthlyTarget: 500,
    downPayment: 2500,
    termMonths: 60,
    consent: true,
  };
}

async function createContacted(input: {
  email: string;
  submittedAt: string;
  adapter: PostgresCrmPersistenceAdapter;
  pool: ReturnType<typeof createPostgresCrmPool>;
}) {
  const lead = makeLead(input.email);
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence, createdAt: input.submittedAt });
  const handoff = createManagerHandoff({ deskPrep, createdAt: input.submittedAt });
  const persisted = await persistLeadAsCrmOpportunity({
    lead,
    inventoryEvidence,
    managerHandoff: handoff,
    submittedAt: input.submittedAt,
    adapter: input.adapter,
  });
  await executeFirstContactAttemptCommand({
    pool: input.pool,
    workspaceId: "norautomatch",
    opportunityId: persisted.opportunityId,
    evidenceRef: `sms-provider:attempt:${input.email}`,
    authority: "NORAUTO_SYSTEM",
    observedAt: new Date(Date.parse(input.submittedAt) + 2 * 60_000).toISOString(),
  });
  await executeContactConfirmationCommand({
    pool: input.pool,
    workspaceId: "norautomatch",
    opportunityId: persisted.opportunityId,
    evidenceRef: `sms-provider:confirmed:${input.email}`,
    authority: "MANAGER",
    observedAt: new Date(Date.parse(input.submittedAt) + 4 * 60_000).toISOString(),
  });
  return persisted;
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for sales progression integration test.");
  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);

  try {
    const sold = await createContacted({ email: "sold-progression@example.com", submittedAt: "2026-09-09T07:00:00.000Z", adapter, pool });

    const appointmentQueueBefore = await readAppointmentConfirmationQueue({ pool, workspaceId: "norautomatch", limit: 100 });
    const queued = appointmentQueueBefore.find((item) => item.opportunityId === sold.opportunityId);
    assert(queued?.stage === "CONTACTED", "CONTACTED opportunity must appear in appointment confirmation queue.");
    assert(queued.truthState === "READ_MODEL_ONLY" && queued.authorityEffect === "NONE", "Appointment queue must remain non-authoritative.");

    const appointmentEvidence = "dealer-calendar:appointment:ci-001";
    const appointmentAt = "2026-09-09T07:06:00.000Z";
    const appointment = await executeAppointmentConfirmationCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: sold.opportunityId,
      evidenceRef: appointmentEvidence,
      authority: "MANAGER",
      observedAt: appointmentAt,
    });
    assert(appointment.status === "APPLIED", "Appointment must apply exactly once.");
    assert(appointment.stage === "APPOINTMENT_SET", "Confirmed appointment must advance CONTACTED to APPOINTMENT_SET.");
    assert(appointment.attribution.source === "CI-Sales-Progression", "Appointment must preserve original acquisition source attribution.");

    const appointmentQueueAfter = await readAppointmentConfirmationQueue({ pool, workspaceId: "norautomatch", limit: 100 });
    assert(!appointmentQueueAfter.some((item) => item.opportunityId === sold.opportunityId), "APPOINTMENT_SET opportunity must leave confirmation queue.");

    const appointmentReplay = await executeAppointmentConfirmationCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: sold.opportunityId,
      evidenceRef: appointmentEvidence,
      authority: "MANAGER",
      observedAt: appointmentAt,
    });
    assert(appointmentReplay.status === "DEDUPLICATED", "Exact appointment replay must deduplicate.");

    const soldEvidence = "dealer-dms:sold:deal-ci-001";
    const soldAt = "2026-09-09T08:30:00.000Z";
    const soldResult = await executeOutcomeCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: sold.opportunityId,
      outcome: "SOLD",
      evidenceRef: soldEvidence,
      authority: "DEALERSHIP_SYSTEM",
      observedAt: soldAt,
    });
    assert(soldResult.status === "APPLIED" && soldResult.stage === "SOLD", "Dealership sold evidence must terminally mark APPOINTMENT_SET as SOLD.");
    assert(soldResult.attribution.source === "CI-Sales-Progression", "Sold outcome must preserve original acquisition source attribution.");

    const soldReplay = await executeOutcomeCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: sold.opportunityId,
      outcome: "SOLD",
      evidenceRef: soldEvidence,
      authority: "DEALERSHIP_SYSTEM",
      observedAt: soldAt,
    });
    assert(soldReplay.status === "DEDUPLICATED", "Exact sold replay must deduplicate.");

    const durableSold = await pool.query<{
      stage: string;
      outcome_type: string | null;
      outcome_evidence_ref: string | null;
      attribution: { source?: string };
      sold_evidence: string;
      outcome_events: string;
    }>(
      `SELECT o.stage, o.outcome_type, o.outcome_evidence_ref, o.attribution,
              (SELECT COUNT(*)::text FROM crm_evidence e WHERE e.workspace_id=o.workspace_id AND e.opportunity_id=o.opportunity_id AND e.kind='DEALERSHIP_SOLD_OUTCOME' AND e.evidence_ref=$3) AS sold_evidence,
              (SELECT COUNT(*)::text FROM crm_outbox x WHERE x.workspace_id=o.workspace_id AND x.aggregate_id=o.opportunity_id AND x.event_type='CRM_OUTCOME_RECORDED' AND x.payload->>'evidenceRef'=$3) AS outcome_events
         FROM crm_opportunities o WHERE o.workspace_id=$1 AND o.opportunity_id=$2`,
      ["norautomatch", sold.opportunityId, soldEvidence],
    );
    assert(durableSold.rows[0]?.stage === "SOLD" && durableSold.rows[0]?.outcome_type === "SOLD", "Durable sold state must be terminal and internally consistent.");
    assert(durableSold.rows[0]?.outcome_evidence_ref === soldEvidence, "Durable sold outcome must bind exact evidence reference.");
    assert(durableSold.rows[0]?.sold_evidence === "1" && durableSold.rows[0]?.outcome_events === "1", "Sold evidence and outcome event must each be durable exactly once.");
    assert(durableSold.rows[0]?.attribution.source === "CI-Sales-Progression", "Durable attribution must remain original after sold outcome.");

    const lost = await createContacted({ email: "lost-progression@example.com", submittedAt: "2026-09-09T09:00:00.000Z", adapter, pool });
    const lostEvidence = "manager-disposition:lost:ci-001";
    const lostResult = await executeOutcomeCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: lost.opportunityId,
      outcome: "LOST",
      evidenceRef: lostEvidence,
      authority: "MANAGER",
      observedAt: "2026-09-09T09:20:00.000Z",
    });
    assert(lostResult.status === "APPLIED" && lostResult.stage === "LOST", "Manager evidence must allow CONTACTED -> LOST.");

    const queueAfterLost = await readAppointmentConfirmationQueue({ pool, workspaceId: "norautomatch", limit: 100 });
    assert(!queueAfterLost.some((item) => item.opportunityId === lost.opportunityId), "LOST opportunity must not remain in appointment confirmation queue.");

    let soldWithoutAppointmentRejected = false;
    const noAppointment = await createContacted({ email: "sold-without-appointment@example.com", submittedAt: "2026-09-09T10:00:00.000Z", adapter, pool });
    try {
      await executeOutcomeCommand({
        pool,
        workspaceId: "norautomatch",
        opportunityId: noAppointment.opportunityId,
        outcome: "SOLD",
        evidenceRef: "dealer-dms:sold:invalid-no-appointment",
        authority: "DEALERSHIP_SYSTEM",
        observedAt: "2026-09-09T10:10:00.000Z",
      });
    } catch {
      soldWithoutAppointmentRejected = true;
    }
    assert(soldWithoutAppointmentRejected, "SOLD must fail closed without APPOINTMENT_SET predecessor.");

    const invalidEvidence = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_evidence WHERE workspace_id=$1 AND opportunity_id=$2 AND evidence_ref=$3`,
      ["norautomatch", noAppointment.opportunityId, "dealer-dms:sold:invalid-no-appointment"],
    );
    assert(invalidEvidence.rows[0]?.count === "0", "Rejected sold mutation must roll back without orphan evidence.");

    console.log("PASS_NODE_POSTGRES_APPOINTMENT_AND_OUTCOME_ATTRIBUTION");
  } finally {
    await pool.end();
  }
}

run();
