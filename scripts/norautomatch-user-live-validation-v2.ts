import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { createManagerSessionTokenForTrustedIssuer } from "../src/lib/manager-session-auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
}

async function jsonRequest(input: {
  baseUrl: string;
  path: string;
  token?: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  expectedStatus: number;
}) {
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method ?? "POST",
    headers: {
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      ...(input.body ? { "Content-Type": "application/json" } : {}),
      "X-NorAuto-Validation": "synthetic-user-live-v1",
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });
  let body: unknown = null;
  try { body = await response.json(); } catch {}
  assert(response.status === input.expectedStatus, `${input.path} returned ${response.status}; expected ${input.expectedStatus}.`);
  return body as Record<string, unknown>;
}

async function main() {
  const baseUrl = requireEnv("NORAUTO_VALIDATION_BASE_URL").replace(/\/$/, "");
  const databaseUrl = requireEnv("NORAUTO_CRM_DATABASE_URL");
  const managerSecret = requireEnv("NORAUTO_MANAGER_SESSION_SECRET");
  assert(managerSecret.length >= 32, "NORAUTO_MANAGER_SESSION_SECRET must contain at least 32 characters.");

  const runId = randomUUID();
  const shortRun = runId.replace(/-/g, "").slice(0, 12);
  const nowEpoch = Math.floor(Date.now() / 1000);
  const token = createManagerSessionTokenForTrustedIssuer({
    configuredSecret: managerSecret,
    claims: {
      protocol: "NORAUTO_MANAGER_SESSION_V1",
      subjectId: `user-live-manager-${shortRun}`,
      workspaceId: "norautomatch",
      role: "MANAGER",
      verifier: "LOCAL_USER_LIVE_HARNESS_V1",
      evidenceRef: `synthetic:user-live:${runId}`,
      issuedAt: nowEpoch,
      expiresAt: nowEpoch + 15 * 60,
      nonce: randomUUID(),
    },
  });

  const unauthorized = await fetch(`${baseUrl}/api/manager/queue`, { cache: "no-store" });
  assert(unauthorized.status === 401, `Unauthenticated manager queue returned ${unauthorized.status}; expected 401.`);

  const lead = await jsonRequest({
    baseUrl,
    path: "/api/leads",
    expectedStatus: 202,
    body: {
      firstName: "Synthetic",
      lastName: "Validator",
      email: `norauto-user-live-${shortRun}@example.invalid`,
      phone: "4055550101",
      budgetRange: "$25,000-$35,000",
      paymentMethod: "Financing",
      tradeIn: "",
      notes: `SYNTHETIC USER-LIVE VALIDATION ${runId}; NOT A REAL CUSTOMER`,
      source: "USER_LIVE_VALIDATION",
      trigger: "trapdoor",
      pipeline: "Vehicle Sourcing",
      shortlistedVehicleIds: [],
      monthlyTarget: 500,
      downPayment: 2500,
      termMonths: 60,
      consent: true,
    },
  });
  assert(lead.accepted === true, "Synthetic lead was not accepted.");
  assert(lead.persistence === "COMMITTED", `Expected durable COMMITTED intake; received ${String(lead.persistence)}.`);
  assert(lead.delivery === "QUEUED", "Durable intake did not queue the transactional outbox boundary.");
  const opportunityId = typeof lead.opportunityId === "string" ? lead.opportunityId : "";
  assert(/^namo_[0-9a-f]{24}$/.test(opportunityId), "Lead response did not return a valid opportunityId.");

  const managerQueue = await jsonRequest({
    baseUrl,
    path: "/api/manager/queue?limit=100",
    method: "GET",
    token,
    expectedStatus: 200,
  });
  const queueItems = Array.isArray(managerQueue.items) ? managerQueue.items as Array<Record<string, unknown>> : [];
  assert(queueItems.some((item) => item.opportunityId === opportunityId), "Synthetic opportunity was not visible in authenticated manager queue.");

  const attemptEvidenceRef = `synthetic:contact-attempt:${runId}`;
  const attempt = await jsonRequest({
    baseUrl,
    path: "/api/manager/follow-up/attempt",
    token,
    expectedStatus: 200,
    body: { opportunityId, evidenceRef: attemptEvidenceRef, observedAt: new Date().toISOString() },
  });
  assert((attempt.result as Record<string, unknown> | undefined)?.stage === "CONTACT_PENDING", "Contact attempt did not advance NEW to CONTACT_PENDING.");
  assert(attempt.authorityEffect === "FIRST_CONTACT_ATTEMPT_RECORDED_ONLY", "Contact attempt widened authority unexpectedly.");

  const confirmationEvidenceRef = `synthetic:contact-confirmed:${runId}`;
  const confirmation = await jsonRequest({
    baseUrl,
    path: "/api/manager/follow-up/confirm",
    token,
    expectedStatus: 200,
    body: { opportunityId, evidenceRef: confirmationEvidenceRef, observedAt: new Date().toISOString() },
  });
  assert((confirmation.result as Record<string, unknown> | undefined)?.stage === "CONTACTED", "Confirmed contact did not advance CONTACT_PENDING to CONTACTED.");
  assert(confirmation.authorityEffect === "CONTACT_CONFIRMED_ONLY", "Contact confirmation widened authority unexpectedly.");

  const appointmentEvidenceRef = `synthetic:appointment-confirmed:${runId}`;
  const appointment = await jsonRequest({
    baseUrl,
    path: "/api/manager/progression/appointment",
    token,
    expectedStatus: 200,
    body: { opportunityId, evidenceRef: appointmentEvidenceRef, observedAt: new Date().toISOString() },
  });
  assert((appointment.result as Record<string, unknown> | undefined)?.stage === "APPOINTMENT_SET", "Appointment did not advance CONTACTED to APPOINTMENT_SET.");
  assert(appointment.authorityEffect === "APPOINTMENT_RECORDED_ONLY", "Appointment recording widened authority unexpectedly.");

  const soldEvidenceRef = `synthetic:manager-sold-confirmation:${runId}`;
  const sold = await jsonRequest({
    baseUrl,
    path: "/api/manager/progression/outcome",
    token,
    expectedStatus: 200,
    body: { opportunityId, outcome: "SOLD", evidenceRef: soldEvidenceRef, observedAt: new Date().toISOString() },
  });
  assert((sold.result as Record<string, unknown> | undefined)?.stage === "SOLD", "Evidence-gated outcome did not advance APPOINTMENT_SET to SOLD.");
  assert(sold.authorityEffect === "OUTCOME_RECORDED_ONLY", "Outcome recording widened authority unexpectedly.");

  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const durable = await pool.query<{
      stage: string;
      outcome_type: string | null;
      outcome_evidence_ref: string | null;
      source: string | null;
      first_contact_satisfied: boolean;
      attempt_count: string;
      confirmation_count: string;
      appointment_count: string;
      sold_count: string;
      stage_event_count: string;
      outcome_event_count: string;
    }>(
      `SELECT o.stage, o.outcome_type, o.outcome_evidence_ref,
              o.attribution->>'source' AS source,
              EXISTS (
                SELECT 1 FROM crm_follow_up_obligations f
                 WHERE f.workspace_id=o.workspace_id AND f.opportunity_id=o.opportunity_id
                   AND f.obligation_type='FIRST_CONTACT' AND f.satisfied_at IS NOT NULL
                   AND f.satisfaction_evidence_ref=$3
              ) AS first_contact_satisfied,
              (SELECT COUNT(*)::text FROM crm_evidence e WHERE e.workspace_id=o.workspace_id AND e.opportunity_id=o.opportunity_id AND e.kind='CONTACT_ATTEMPT' AND e.evidence_ref=$3) AS attempt_count,
              (SELECT COUNT(*)::text FROM crm_evidence e WHERE e.workspace_id=o.workspace_id AND e.opportunity_id=o.opportunity_id AND e.kind='CONTACT_CONFIRMED' AND e.evidence_ref=$4) AS confirmation_count,
              (SELECT COUNT(*)::text FROM crm_evidence e WHERE e.workspace_id=o.workspace_id AND e.opportunity_id=o.opportunity_id AND e.kind='APPOINTMENT_CONFIRMED' AND e.evidence_ref=$5) AS appointment_count,
              (SELECT COUNT(*)::text FROM crm_evidence e WHERE e.workspace_id=o.workspace_id AND e.opportunity_id=o.opportunity_id AND e.kind='DEALERSHIP_SOLD_OUTCOME' AND e.evidence_ref=$6) AS sold_count,
              (SELECT COUNT(*)::text FROM crm_outbox x WHERE x.workspace_id=o.workspace_id AND x.aggregate_id=o.opportunity_id AND x.event_type='CRM_OPPORTUNITY_STAGE_CHANGED') AS stage_event_count,
              (SELECT COUNT(*)::text FROM crm_outbox x WHERE x.workspace_id=o.workspace_id AND x.aggregate_id=o.opportunity_id AND x.event_type='CRM_OUTCOME_RECORDED' AND x.payload->>'evidenceRef'=$6) AS outcome_event_count
         FROM crm_opportunities o
        WHERE o.workspace_id=$1 AND o.opportunity_id=$2`,
      ["norautomatch", opportunityId, attemptEvidenceRef, confirmationEvidenceRef, appointmentEvidenceRef, soldEvidenceRef],
    );
    const row = durable.rows[0];
    assert(row, "Durable synthetic opportunity disappeared.");
    assert(row.stage === "SOLD" && row.outcome_type === "SOLD", "Durable terminal state is not SOLD/SOLD.");
    assert(row.outcome_evidence_ref === soldEvidenceRef, "Durable SOLD state is not bound to exact synthetic evidence.");
    assert(row.source === "USER_LIVE_VALIDATION", "Original source attribution was not preserved.");
    assert(row.first_contact_satisfied, "FIRST_CONTACT obligation is not satisfied by exact attempt evidence.");
    assert(row.attempt_count === "1", "CONTACT_ATTEMPT evidence count is not exactly one.");
    assert(row.confirmation_count === "1", "CONTACT_CONFIRMED evidence count is not exactly one.");
    assert(row.appointment_count === "1", "APPOINTMENT_CONFIRMED evidence count is not exactly one.");
    assert(row.sold_count === "1", "DEALERSHIP_SOLD_OUTCOME evidence count is not exactly one.");
    assert(Number(row.stage_event_count) >= 3, "Expected stage-change outbox events are missing.");
    assert(row.outcome_event_count === "1", "CRM_OUTCOME_RECORDED outbox event count is not exactly one.");

    const receipt = {
      protocol: "NORAUTO_USER_LIVE_VALIDATION_RECEIPT_V1",
      truthState: "USER_OBSERVED_LOCAL_REAL_ENVIRONMENT_CANDIDATE",
      generatedAt: new Date().toISOString(),
      gitHead: gitHead(),
      runId,
      synthetic: true,
      environment: {
        baseUrl,
        database: "DISPOSABLE_LOCAL_POSTGRESQL",
        inventoryMode: process.env.NORAUTO_INVENTORY_MODE ?? "demo",
        crmWebhookConfigured: Boolean(process.env.CRM_WEBHOOK_URL?.trim()),
      },
      opportunityId,
      checks: {
        unauthenticatedManagerQueueRejected: true,
        durableLeadIntake: true,
        authenticatedManagerQueueRead: true,
        firstContactAttemptEvidenceBound: true,
        confirmedContactSeparatedFromAttempt: true,
        appointmentEvidenceBound: true,
        soldOutcomeEvidenceBound: true,
        attributionPreserved: true,
        durableEvidenceExactlyOnce: true,
        transactionalOutboxRecorded: true,
      },
      authority: {
        customerData: "SYNTHETIC_ONLY",
        liveInventory: false,
        externalCrmDelivery: false,
        productionAuthority: "NONE",
      },
      result: "PASS_NORAUTO_USER_LIVE_SYNTHETIC_WORKFLOW",
    };

    const receiptDir = join(process.cwd(), "validation_receipts");
    mkdirSync(receiptDir, { recursive: true });
    const receiptPath = join(receiptDir, `norautomatch_user_live_${shortRun}.json`);
    const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
    writeFileSync(receiptPath, receiptBytes, "utf8");
    const receiptHash = createHash("sha256").update(receiptBytes, "utf8").digest("hex");

    console.log("PASS_NORAUTO_USER_LIVE_SYNTHETIC_WORKFLOW");
    console.log(`RECEIPT_PATH=${receiptPath}`);
    console.log(`RECEIPT_SHA256=${receiptHash}`);
    console.log(`GIT_HEAD=${receipt.gitHead}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL_NORAUTO_USER_LIVE_SYNTHETIC_WORKFLOW");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
