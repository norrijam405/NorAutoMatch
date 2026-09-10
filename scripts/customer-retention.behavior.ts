import assert from "node:assert/strict";
import type { CrmOpportunity } from "../src/lib/crm-core";
import {
  createRetentionSignal,
  evaluateRetentionEligibility,
  prepareRetentionTask,
  type RetentionPolicyState,
} from "../src/lib/customer-retention";

const observedAt = "2026-09-10T22:50:00.000Z";

function opportunity(stage: CrmOpportunity["stage"] = "NEW"): CrmOpportunity {
  return {
    protocol: "NORAUTO_CRM_OPPORTUNITY_V1",
    opportunityId: "namo_retention_test_001",
    intakeIdempotencyKey: "test-key",
    pipeline: "SALES",
    stage,
    deskState: "MANAGER_ACKNOWLEDGED",
    createdAt: "2026-09-10T20:00:00.000Z",
    updatedAt: "2026-09-10T20:00:00.000Z",
    customer: {
      firstName: "Test",
      lastName: "Customer",
      email: "test@example.invalid",
      phone: "+15555550100",
      consent: true,
    },
    buyingIntent: {
      budgetRange: "$20k-$30k",
      paymentMethod: "FINANCE",
      notes: "Synthetic retention CI fixture only.",
    },
    inventoryEvidence: {
      protocol: "NORAUTO_LEAD_INVENTORY_EVIDENCE_V1",
      capturedAt: "2026-09-10T20:00:00.000Z",
      evidenceState: "REPRESENTATIVE_ONLY",
      inventoryMode: "REPRESENTATIVE_DEMO",
      selectedVehicles: [],
      disclaimer: "Synthetic CI fixture.",
    },
    latestHandoffId: "handoff_test",
    attribution: { source: "synthetic-ci" },
    evidence: [
      {
        kind: "LEAD_SUBMISSION",
        ref: "evidence:test-lead",
        observedAt: "2026-09-10T20:00:00.000Z",
        authority: "CUSTOMER",
      },
    ],
  };
}

function eligiblePolicy(overrides: Partial<RetentionPolicyState> = {}): RetentionPolicyState {
  return {
    workspaceId: "orr-nissan-west-test",
    purposeAllowed: true,
    channelAuthorized: true,
    consentState: "CONSENTED",
    suppressionState: "CLEAR",
    cadenceState: "ELIGIBLE",
    humanApprovalRequired: false,
    humanApprovalPresent: false,
    highRiskEscalationRequired: false,
    ...overrides,
  };
}

const baseOpportunity = opportunity();
const baseStage = baseOpportunity.stage;
const signal = createRetentionSignal({
  workspaceId: "orr-nissan-west-test",
  opportunity: baseOpportunity,
  signalType: "FOLLOW_UP_STALLED",
  observedAt,
  sourceEvidenceRefs: ["evidence:test-lead", "evidence:test-follow-up-due"],
});

assert.equal(signal.authorityEffect, "NONE");
assert.equal(baseOpportunity.stage, baseStage, "Signal detection must not mutate CRM stage.");

assert.throws(
  () => createRetentionSignal({
    workspaceId: "",
    opportunity: baseOpportunity,
    signalType: "FOLLOW_UP_STALLED",
    observedAt,
    sourceEvidenceRefs: ["evidence:test"],
  }),
  /workspace boundary/,
);

assert.throws(
  () => createRetentionSignal({
    workspaceId: "orr-nissan-west-test",
    opportunity: baseOpportunity,
    signalType: "FOLLOW_UP_STALLED",
    observedAt,
    sourceEvidenceRefs: [],
  }),
  /source evidence reference/,
);

assert.throws(
  () => createRetentionSignal({
    workspaceId: "orr-nissan-west-test",
    opportunity: baseOpportunity,
    signalType: "POST_SALE_CHECK_IN_DUE",
    observedAt,
    sourceEvidenceRefs: ["evidence:test"],
  }),
  /requires a SOLD opportunity state/,
);

const soldSignal = createRetentionSignal({
  workspaceId: "orr-nissan-west-test",
  opportunity: opportunity("SOLD"),
  signalType: "POST_SALE_CHECK_IN_DUE",
  observedAt,
  sourceEvidenceRefs: ["evidence:manager-sold-outcome"],
});
assert.equal(soldSignal.signalType, "POST_SALE_CHECK_IN_DUE");

assert.throws(
  () => evaluateRetentionEligibility({
    signal,
    policy: eligiblePolicy({ workspaceId: "other-workspace" }),
  }),
  /workspace does not match/,
);

for (const challenge of [
  {
    policy: eligiblePolicy({ purposeAllowed: false }),
    expected: "PURPOSE_NOT_ALLOWED",
  },
  {
    policy: eligiblePolicy({ suppressionState: "SUPPRESSED" }),
    expected: "SUPPRESSED",
  },
  {
    policy: eligiblePolicy({ suppressionState: "UNKNOWN" }),
    expected: "SUPPRESSED",
  },
  {
    policy: eligiblePolicy({ consentState: "UNKNOWN" }),
    expected: "CONSENT_REQUIRED",
  },
  {
    policy: eligiblePolicy({ consentState: "NOT_CONSENTED" }),
    expected: "CONSENT_REQUIRED",
  },
  {
    policy: eligiblePolicy({ channelAuthorized: false }),
    expected: "CHANNEL_NOT_AUTHORIZED",
  },
  {
    policy: eligiblePolicy({ cadenceState: "BLOCKED" }),
    expected: "CADENCE_BLOCKED",
  },
  {
    policy: eligiblePolicy({ cadenceState: "UNKNOWN" }),
    expected: "CADENCE_BLOCKED",
  },
  {
    policy: eligiblePolicy({ humanApprovalRequired: true, humanApprovalPresent: false }),
    expected: "HUMAN_APPROVAL_REQUIRED",
  },
] as const) {
  const result = evaluateRetentionEligibility({ signal, policy: challenge.policy });
  assert.equal(result.state, challenge.expected);
  assert.equal(result.mayPrepareTask, false);
  assert.equal(result.mayAutonomouslySend, false);
  assert.throws(
    () => prepareRetentionTask({ signal, eligibility: result, createdAt: observedAt }),
    /task preparation blocked/,
  );
}

const eligible = evaluateRetentionEligibility({ signal, policy: eligiblePolicy() });
assert.equal(eligible.state, "ELIGIBLE_FOR_BOUNDED_TASK");
assert.equal(eligible.mayPrepareTask, true);
assert.equal(eligible.mayAutonomouslySend, false);

const task = prepareRetentionTask({ signal, eligibility: eligible, createdAt: observedAt });
assert.equal(task.status, "PREPARED_NOT_SENT");
assert.equal(task.authorityEffect, "NONE");
assert.deepEqual(task.outcomeClaims, {
  delivered: false,
  customerReached: false,
  customerSatisfied: false,
  retained: false,
  appointmentConfirmed: false,
  sold: false,
});
assert.equal(baseOpportunity.stage, baseStage, "Task preparation must not mutate CRM stage.");

const complaintSignal = createRetentionSignal({
  workspaceId: "orr-nissan-west-test",
  opportunity: baseOpportunity,
  signalType: "COMPLAINT_OR_RECOVERY_CANDIDATE",
  observedAt,
  sourceEvidenceRefs: ["evidence:customer-complaint"],
});
const escalation = evaluateRetentionEligibility({
  signal: complaintSignal,
  policy: eligiblePolicy({ highRiskEscalationRequired: true }),
});
assert.equal(escalation.state, "ESCALATE_TO_HUMAN");
assert.equal(escalation.mayPrepareTask, true);
assert.equal(escalation.mayAutonomouslySend, false);
const escalationTask = prepareRetentionTask({
  signal: complaintSignal,
  eligibility: escalation,
  createdAt: observedAt,
});
assert.equal(escalationTask.actionClass, "COMPLAINT_ESCALATION");
assert.equal(escalationTask.status, "PREPARED_NOT_SENT");

console.log("Customer retention behavior challenges: PASS");
