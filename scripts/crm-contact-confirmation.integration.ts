import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import { confirmCustomerContact } from "../src/lib/crm-contact-confirmation";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import type { ManagerActorEvidence } from "../src/lib/manager-review-receipt";
import { persistLeadAsCrmOpportunity } from "../src/lib/crm-lead-intake";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

const lead: LeadPayload = {
  firstName: "Contact",
  lastName: "Evidence",
  email: "contact-evidence@example.com",
  phone: "4055550166",
  budgetRange: "$30,000-$40,000",
  paymentMethod: "Financing",
  tradeIn: "",
  notes: "atomic contact confirmation test",
  source: "CI-Contact-Confirmation",
  trigger: "retail",
  pipeline: "Standard Retail",
  shortlistedVehicleIds: [],
  monthlyTarget: 600,
  downPayment: 3000,
  termMonths: 60,
  consent: true,
};

const inventoryEvidence: LeadInventoryEvidence = {
  state: "NO_SHORTLIST",
  requestedVehicleIds: [],
  verifiedVehicleIds: [],
  unverifiedVehicleIds: [],
};

const verifiedActor: ManagerActorEvidence = {
  state: "VERIFIED",
  subjectId: "manager-contact-test",
  verifier: "ci-identity-gateway",
  verifiedAt: "2026-09-09T06:00:00.000Z",
  evidenceRef: "manager-session-evidence-contact-test",
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
    const intake = await persistLeadAsCrmOpportunity({
      lead,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter,
    });

    await expectReject(
      () => confirmCustomerContact({
        pool,
        workspaceId: "norautomatch",
        opportunityId: intake.opportunityId,
        contactEvidenceRef: "call-record-unverified",
        actor: { ...verifiedActor, state: "UNVERIFIED" },
        observedAt: "2026-09-09T06:04:00.000Z",
      }),
      "Unverified actor must not confirm customer contact.",
    );

    const untouched = await pool.query<{ stage: string; evidence_count: string; satisfied_at: Date | null }>(
      `SELECT o.stage,
              (SELECT count(*)::text FROM crm_evidence e
                WHERE e.workspace_id = o.workspace_id AND e.opportunity_id = o.opportunity_id
                  AND e.kind = 'CONTACT_CONFIRMED') AS evidence_count,
              f.satisfied_at
         FROM crm_opportunities o
         JOIN crm_follow_up_obligations f
           ON f.workspace_id = o.workspace_id AND f.opportunity_id = o.opportunity_id
        WHERE o.workspace_id = 'norautomatch' AND o.opportunity_id = $1
          AND f.obligation_type = 'FIRST_CONTACT'`,
      [intake.opportunityId],
    );
    assert(untouched.rows[0].stage === "NEW", "Rejected contact confirmation must not change CRM stage.");
    assert(Number(untouched.rows[0].evidence_count) === 0, "Rejected contact confirmation must not create contact evidence.");
    assert(untouched.rows[0].satisfied_at === null, "Rejected contact confirmation must not satisfy follow-up obligation.");

    const applied = await confirmCustomerContact({
      pool,
      workspaceId: "norautomatch",
      opportunityId: intake.opportunityId,
      contactEvidenceRef: "call-record-verified-001",
      actor: verifiedActor,
      observedAt: "2026-09-09T06:04:00.000Z",
    });
    assert(applied.status === "APPLIED", "Verified contact confirmation must apply atomically.");
    assert(applied.stage === "CONTACTED", "Applied contact confirmation must finish at CONTACTED.");
    assert(applied.outboxEventIds.length === 2, "NEW contact confirmation must preserve NEW->CONTACT_PENDING->CONTACTED audit sequence.");

    const state = await pool.query<{
      stage: string;
      satisfied_at: Date | null;
      satisfaction_evidence_ref: string | null;
      contact_evidence_count: string;
      stage_event_count: string;
    }>(
      `SELECT o.stage, f.satisfied_at, f.satisfaction_evidence_ref,
              (SELECT count(*)::text FROM crm_evidence e
                WHERE e.workspace_id = o.workspace_id AND e.opportunity_id = o.opportunity_id
                  AND e.kind = 'CONTACT_CONFIRMED') AS contact_evidence_count,
              (SELECT count(*)::text FROM crm_outbox x
                WHERE x.workspace_id = o.workspace_id AND x.aggregate_id = o.opportunity_id
                  AND x.event_type = 'CRM_OPPORTUNITY_STAGE_CHANGED') AS stage_event_count
         FROM crm_opportunities o
         JOIN crm_follow_up_obligations f
           ON f.workspace_id = o.workspace_id AND f.opportunity_id = o.opportunity_id
        WHERE o.workspace_id = 'norautomatch' AND o.opportunity_id = $1
          AND f.obligation_type = 'FIRST_CONTACT'`,
      [intake.opportunityId],
    );
    assert(state.rows[0].stage === "CONTACTED", "CRM row must record CONTACTED after verified confirmation.");
    assert(state.rows[0].satisfied_at?.toISOString() === "2026-09-09T06:04:00.000Z", "Follow-up satisfaction must preserve exact observed time.");
    assert(state.rows[0].satisfaction_evidence_ref === "call-record-verified-001", "Follow-up satisfaction must preserve exact contact evidence reference.");
    assert(Number(state.rows[0].contact_evidence_count) === 1, "Exactly one CONTACT_CONFIRMED evidence row must be recorded.");
    assert(Number(state.rows[0].stage_event_count) === 2, "Canonical two-step stage transition must be represented by exactly two stage events.");

    const retry = await confirmCustomerContact({
      pool,
      workspaceId: "norautomatch",
      opportunityId: intake.opportunityId,
      contactEvidenceRef: "call-record-verified-001",
      actor: verifiedActor,
      observedAt: "2026-09-09T06:04:00.000Z",
    });
    assert(retry.status === "DEDUPLICATED", "Exact contact confirmation retry must deduplicate.");

    await expectReject(
      () => confirmCustomerContact({
        pool,
        workspaceId: "norautomatch",
        opportunityId: intake.opportunityId,
        contactEvidenceRef: "different-call-record",
        actor: verifiedActor,
        observedAt: "2026-09-09T06:05:00.000Z",
      }),
      "Conflicting contact evidence must not rewrite a satisfied obligation.",
    );

    await expectReject(
      async () => {
        await pool.query(
          `UPDATE crm_follow_up_obligations
              SET due_at = due_at + interval '1 minute'
            WHERE workspace_id = 'norautomatch' AND opportunity_id = $1 AND obligation_type = 'FIRST_CONTACT'`,
          [intake.opportunityId],
        );
      },
      "Follow-up due history must be immutable after creation.",
    );

    await expectReject(
      async () => {
        await pool.query(
          `UPDATE crm_follow_up_obligations
              SET satisfaction_evidence_ref = 'rewritten-proof'
            WHERE workspace_id = 'norautomatch' AND opportunity_id = $1 AND obligation_type = 'FIRST_CONTACT'`,
          [intake.opportunityId],
        );
      },
      "Satisfied follow-up evidence must be immutable.",
    );

    console.log("PASS_POSTGRES_ATOMIC_EVIDENCE_BACKED_CONTACT_CONFIRMATION");
  } finally {
    await pool.end();
  }
}

run();
