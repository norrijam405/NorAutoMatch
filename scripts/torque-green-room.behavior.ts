import assert from "node:assert/strict";
import {
  advanceCrmOpportunity,
  type CrmEvidenceRef,
  type CrmOpportunity,
} from "../src/lib/crm-core";
import {
  createRetentionSignal,
  evaluateRetentionEligibility,
  prepareRetentionTask,
  type RetentionPolicyState,
} from "../src/lib/customer-retention";
import { classifyLeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import { evaluateCostRegression } from "../src/lib/cost-regression";

const now = "2026-09-10T23:10:00.000Z";

function opportunity(stage: CrmOpportunity["stage"] = "CONTACT_PENDING"): CrmOpportunity {
  return {
    protocol: "NORAUTO_CRM_OPPORTUNITY_V1",
    opportunityId: "torque_synthetic_001",
    intakeIdempotencyKey: "torque-test-key",
    pipeline: "Standard Retail",
    stage,
    deskState: "MANAGER_ACKNOWLEDGED",
    createdAt: "2026-09-10T22:00:00.000Z",
    updatedAt: "2026-09-10T22:00:00.000Z",
    customer: {
      firstName: "Synthetic",
      lastName: "Customer",
      email: "synthetic@example.invalid",
      phone: "+15555550100",
      consent: true,
    },
    buyingIntent: {
      budgetRange: "$20k-$30k",
      paymentMethod: "Financing",
      notes: "Synthetic Torque Green Room fixture only.",
    },
    inventoryEvidence: {
      state: "REPRESENTATIVE_ONLY",
      requestedVehicleIds: ["vehicle-demo-001"],
      verifiedVehicleIds: [],
      unverifiedVehicleIds: ["vehicle-demo-001"],
      catalogSource: "representative",
      catalogGeneratedAt: "2026-09-10T21:00:00.000Z",
    },
    latestHandoffId: "handoff_synthetic_001",
    attribution: { source: "synthetic-green-room" },
    evidence: [
      {
        kind: "LEAD_SUBMISSION",
        ref: "evidence:synthetic-lead",
        observedAt: "2026-09-10T22:00:00.000Z",
        authority: "CUSTOMER",
      },
    ],
  };
}

function retentionPolicy(overrides: Partial<RetentionPolicyState> = {}): RetentionPolicyState {
  return {
    workspaceId: "torque-green-room-synthetic-v1",
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

// TQ-001: without an authorized live catalog, shortlisted inventory cannot become VERIFIED_LIVE.
const unavailableInventory = classifyLeadInventoryEvidence({
  shortlistedVehicleIds: ["vehicle-demo-001"],
  sourceUnavailable: true,
});
assert.equal(unavailableInventory.state, "LIVE_SOURCE_UNAVAILABLE");
assert.deepEqual(unavailableInventory.verifiedVehicleIds, []);
assert.deepEqual(unavailableInventory.unverifiedVehicleIds, ["vehicle-demo-001"]);

// TQ-003: an attempt receipt cannot manufacture confirmed contact.
const pending = opportunity("CONTACT_PENDING");
const attemptEvidence: CrmEvidenceRef = {
  kind: "CONTACT_ATTEMPT",
  ref: "evidence:attempt-only",
  observedAt: now,
  authority: "NORAUTO_SYSTEM",
};
assert.throws(
  () => advanceCrmOpportunity({ opportunity: pending, to: "CONTACTED", actor: "NORAUTO_SYSTEM", evidence: attemptEvidence }),
  /requires CONTACT_CONFIRMED evidence/,
);

const fakeConfirmation: CrmEvidenceRef = {
  kind: "CONTACT_CONFIRMED",
  ref: "evidence:system-claimed-confirmation",
  observedAt: now,
  authority: "NORAUTO_SYSTEM",
};
assert.throws(
  () => advanceCrmOpportunity({ opportunity: pending, to: "CONTACTED", actor: "NORAUTO_SYSTEM", evidence: fakeConfirmation }),
  /cannot manufacture confirmed customer contact/,
);

// TQ-005: appointment state requires explicit appointment-confirmation evidence.
const contacted = opportunity("CONTACTED");
assert.throws(
  () => advanceCrmOpportunity({ opportunity: contacted, to: "APPOINTMENT_SET", actor: "NORAUTO_SYSTEM" }),
  /requires APPOINTMENT_CONFIRMED evidence/,
);

// TQ-006/TQ-007: system cannot self-mark terminal truth.
const appointment = opportunity("APPOINTMENT_SET");
const soldEvidence: CrmEvidenceRef = {
  kind: "DEALERSHIP_SOLD_OUTCOME",
  ref: "evidence:synthetic-sold",
  observedAt: now,
  authority: "MANAGER",
};
assert.throws(
  () => advanceCrmOpportunity({ opportunity: appointment, to: "SOLD", actor: "NORAUTO_SYSTEM", evidence: soldEvidence }),
  /cannot self-mark an opportunity sold/,
);

const lostEvidence: CrmEvidenceRef = {
  kind: "LOST_OUTCOME",
  ref: "evidence:synthetic-lost",
  observedAt: now,
  authority: "MANAGER",
};
assert.throws(
  () => advanceCrmOpportunity({ opportunity: contacted, to: "LOST", actor: "NORAUTO_SYSTEM", evidence: lostEvidence }),
  /cannot self-mark an opportunity lost/,
);

// TQ-008/TQ-009: suppression and unknown consent fail closed.
const retentionSignal = createRetentionSignal({
  workspaceId: "torque-green-room-synthetic-v1",
  opportunity: pending,
  signalType: "FOLLOW_UP_STALLED",
  observedAt: now,
  sourceEvidenceRefs: ["evidence:synthetic-follow-up-due"],
});

const suppressed = evaluateRetentionEligibility({
  signal: retentionSignal,
  policy: retentionPolicy({ suppressionState: "SUPPRESSED" }),
});
assert.equal(suppressed.state, "SUPPRESSED");
assert.equal(suppressed.mayPrepareTask, false);
assert.equal(suppressed.mayAutonomouslySend, false);

const unknownConsent = evaluateRetentionEligibility({
  signal: retentionSignal,
  policy: retentionPolicy({ consentState: "UNKNOWN" }),
});
assert.equal(unknownConsent.state, "CONSENT_REQUIRED");
assert.equal(unknownConsent.mayPrepareTask, false);
assert.equal(unknownConsent.mayAutonomouslySend, false);

// TQ-010: complaint/recovery stays a prepared human escalation with no outcome claims.
const complaintSignal = createRetentionSignal({
  workspaceId: "torque-green-room-synthetic-v1",
  opportunity: pending,
  signalType: "COMPLAINT_OR_RECOVERY_CANDIDATE",
  observedAt: now,
  sourceEvidenceRefs: ["evidence:synthetic-complaint"],
});
const complaintEligibility = evaluateRetentionEligibility({
  signal: complaintSignal,
  policy: retentionPolicy({ highRiskEscalationRequired: true }),
});
assert.equal(complaintEligibility.state, "ESCALATE_TO_HUMAN");
assert.equal(complaintEligibility.mayAutonomouslySend, false);
const complaintTask = prepareRetentionTask({
  signal: complaintSignal,
  eligibility: complaintEligibility,
  createdAt: now,
});
assert.equal(complaintTask.actionClass, "COMPLAINT_ESCALATION");
assert.equal(complaintTask.status, "PREPARED_NOT_SENT");
assert.equal(complaintTask.outcomeClaims.customerSatisfied, false);
assert.equal(complaintTask.outcomeClaims.retained, false);
assert.equal(complaintTask.outcomeClaims.sold, false);

// TQ-015: material new paid use is a review state, not a silent pass.
const costDecision = evaluateCostRegression({
  baseline: {
    ref: "torque-cost-baseline",
    truthState: "PARTIAL_MEASURED",
    knownDirectCostUsd: 0,
    totalCostUsd: null,
    paidProviderCalls: 0,
    retryCount: 0,
    contextTokens: null,
    computeMilliseconds: null,
    unknownCostCategories: ["HOSTING_ALLOCATION", "HUMAN_REVIEW_ALLOCATION"],
  },
  candidate: {
    ref: "torque-cost-candidate",
    truthState: "PARTIAL_MEASURED",
    knownDirectCostUsd: 0.01,
    totalCostUsd: null,
    paidProviderCalls: 1,
    retryCount: 0,
    contextTokens: null,
    computeMilliseconds: null,
    unknownCostCategories: ["HOSTING_ALLOCATION", "HUMAN_REVIEW_ALLOCATION"],
  },
  policy: {
    materialKnownDirectCostIncreasePercent: 10,
    materialPaidProviderCallIncreasePercent: 0,
    materialRetryIncreasePercent: 25,
    unknownBecomingKnownHigherCostRequiresReview: true,
    knownBecomingUnknownRequiresReview: true,
    newUnknownCostCategoryRequiresReview: true,
  },
});
assert.equal(costDecision.state, "REVIEW_REQUIRED_MATERIAL_REGRESSION");
assert.ok(costDecision.reasons.includes("PAID_PROVIDER_CALLS_MATERIAL_INCREASE"));

// TQ-020: even an eligible retention task proves no delivery, reach, satisfaction, retention, appointment, or sale.
const eligibleRetention = evaluateRetentionEligibility({
  signal: retentionSignal,
  policy: retentionPolicy(),
});
const preparedRetention = prepareRetentionTask({
  signal: retentionSignal,
  eligibility: eligibleRetention,
  createdAt: now,
});
assert.equal(preparedRetention.status, "PREPARED_NOT_SENT");
assert.deepEqual(preparedRetention.outcomeClaims, {
  delivered: false,
  customerReached: false,
  customerSatisfied: false,
  retained: false,
  appointmentConfirmed: false,
  sold: false,
});

console.log("Torque Green Room executable challenge slice: PASS");
