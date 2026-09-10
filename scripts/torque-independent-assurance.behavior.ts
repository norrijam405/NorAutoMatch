import assert from "node:assert/strict";
import { advanceCrmOpportunity, type CrmOpportunity, type CrmEvidenceRef } from "../src/lib/crm-core";
import { evaluateWorkspaceAction, type WorkspaceActionPolicy } from "../src/lib/workspace-policy-runtime";
import { decideCrmRelayRetry } from "../src/lib/crm-relay-retry-policy";
import { createCustomerCommitment, satisfyCustomerCommitment } from "../src/lib/customer-commitment";
import { validateResponseEvidenceClaim } from "../src/lib/response-evidence-claim";
import { evaluateInstructionPrecedence } from "../src/lib/authority-precedence";

const workspaceId = "torque-green-room-independent-v1";

function opportunity(): CrmOpportunity {
  return {
    protocol: "NORAUTO_CRM_OPPORTUNITY_V1",
    opportunityId: "torque_independent_001",
    intakeIdempotencyKey: "independent-key",
    pipeline: "Standard Retail",
    stage: "APPOINTMENT_SET",
    deskState: "MANAGER_ACKNOWLEDGED",
    createdAt: "2026-09-10T22:00:00.000Z",
    updatedAt: "2026-09-10T22:30:00.000Z",
    customer: {
      firstName: "Independent",
      lastName: "Fixture",
      email: "independent@example.invalid",
      phone: "+15555550101",
      consent: true,
    },
    buyingIntent: { budgetRange: "$20k-$30k", paymentMethod: "Financing", notes: "Synthetic independent assurance fixture." },
    inventoryEvidence: { state: "NO_SHORTLIST", requestedVehicleIds: [], verifiedVehicleIds: [], unverifiedVehicleIds: [] },
    latestHandoffId: "handoff-independent",
    attribution: { source: "independent-assurance" },
    evidence: [],
  };
}

function maximallyPermissivePolicy(authorityState: WorkspaceActionPolicy["authorityState"] = "ACTIVE"): WorkspaceActionPolicy {
  return {
    workspaceId,
    authorityState,
    autonomousSendAllowed: true,
    realCrmWriteAllowed: true,
    secondaryCrmCopyAllowed: true,
    eligibleModelProviders: ["qualified-provider"],
    allowedToolClasses: ["qualified-tool"],
    allowedNetworkDestinations: ["https://qualified.example.invalid"],
    terminalOutcomeAuthorities: ["MANAGER", "DEALERSHIP_SYSTEM"],
    humanApprovalRequiredFor: [],
    humanApprovalPresentFor: [],
  };
}

// Independent terminal-truth challenge: even valid-looking manager evidence cannot let the system self-authorize SOLD.
const soldEvidence: CrmEvidenceRef = {
  kind: "DEALERSHIP_SOLD_OUTCOME",
  ref: "evidence:independent-sold",
  observedAt: "2026-09-10T23:00:00.000Z",
  authority: "MANAGER",
};
assert.throws(
  () => advanceCrmOpportunity({ opportunity: opportunity(), to: "SOLD", actor: "NORAUTO_SYSTEM", evidence: soldEvidence }),
  /cannot self-mark an opportunity sold/,
);

// Revocation must dominate otherwise maximally permissive flags.
for (const actionClass of ["EXTERNAL_SEND", "REAL_CRM_WRITE", "SECONDARY_CRM_COPY"] as const) {
  const decision = evaluateWorkspaceAction({
    policy: maximallyPermissivePolicy("REVOKED"),
    request: { workspaceId, actionClass, actor: "NORAUTO_SYSTEM" },
  });
  assert.equal(decision.state, "BLOCK");
  assert.deepEqual(decision.reasons, ["AUTHORITY_REVOKED"]);
}

// Qualification allowlists dominate provider/tool availability.
const providerDecision = evaluateWorkspaceAction({
  policy: maximallyPermissivePolicy(),
  request: { workspaceId, actionClass: "MODEL_PROVIDER_USE", actor: "NORAUTO_SYSTEM", modelProvider: "available-but-unqualified" },
});
assert.equal(providerDecision.state, "BLOCK");

const toolDecision = evaluateWorkspaceAction({
  policy: maximallyPermissivePolicy(),
  request: {
    workspaceId,
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "qualified-tool",
    networkDestination: "https://unapproved.example.invalid",
  },
});
assert.equal(toolDecision.state, "BLOCK");

// Retry exhaustion is terminal for automated retry scheduling.
assert.deepEqual(decideCrmRelayRetry({ attempt: 5, maxAttempts: 5 }), { state: "PARKED", delayMs: null });
assert.deepEqual(decideCrmRelayRetry({ attempt: 99, maxAttempts: 5 }), { state: "PARKED", delayMs: null });

// A promise attempt remains insufficient even when the system actor created the attempt evidence.
const commitment = createCustomerCommitment({
  workspaceId,
  opportunityId: "torque_independent_001",
  type: "CALLBACK",
  summary: "Call customer by promised time",
  createdAt: "2026-09-10T22:00:00.000Z",
  dueAt: "2026-09-10T22:15:00.000Z",
  createdFromEvidenceRef: "evidence:promise",
});
assert.throws(
  () => satisfyCustomerCommitment({
    obligation: commitment,
    workspaceId,
    completedAt: "2026-09-10T22:10:00.000Z",
    completionEvidenceRef: "evidence:dial-attempt",
    authority: "NORAUTO_SYSTEM",
    evidenceKind: "ATTEMPT_ONLY",
  }),
  /explicit completion evidence/,
);

// Evidence that is expired at verification time cannot recover by claiming VERIFIED_CURRENT in its own payload.
const stale = validateResponseEvidenceClaim({
  expectedWorkspaceId: workspaceId,
  now: new Date("2026-09-10T23:00:00.000Z"),
  claim: {
    protocol: "NORAUTO_RESPONSE_EVIDENCE_CLAIM_V1",
    workspaceId,
    topic: "AVAILABILITY",
    value: "Available",
    sourceType: "AUTHORIZED_INVENTORY",
    sourceRef: "synthetic://independent/stale",
    observedAt: "2026-09-10T22:00:00.000Z",
    validUntil: "2026-09-10T22:10:00.000Z",
    evidenceState: "VERIFIED_CURRENT",
  },
});
assert.deepEqual(stale, { valid: false, reason: "EXPIRED" });

// Lower-authority content cannot relax a constitutional boundary.
const precedence = evaluateInstructionPrecedence({
  controllingAuthority: "CONSTITUTIONAL",
  proposedAuthority: "UNTRUSTED_CONTENT",
  wouldRelaxControllingBoundary: true,
});
assert.equal(precedence.state, "REJECT_LOWER_AUTHORITY_OVERRIDE");

console.log("Torque independent automated assurance: PASS");
