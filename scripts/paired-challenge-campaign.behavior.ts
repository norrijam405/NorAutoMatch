import assert from "node:assert/strict";
import { evaluateInstructionPrecedence } from "../src/lib/authority-precedence";
import { decideCrmRelayRetry } from "../src/lib/crm-relay-retry-policy";
import { evaluateWorkspaceAction, type WorkspaceActionPolicy } from "../src/lib/workspace-policy-runtime";
import type { ConversationEvent } from "../src/lib/conversation-gateway";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";
import { createEnrichedResponseDraft } from "../src/lib/conversation-response-enrichment";
import { createResponseEvidencePassport } from "../src/lib/evidence-passport";
import { verifyResponseEvidencePassport } from "../src/lib/evidence-passport-verifier";

const basePolicy: WorkspaceActionPolicy = {
  workspaceId: "dealer-a",
  authorityState: "ACTIVE",
  autonomousSendAllowed: false,
  realCrmWriteAllowed: false,
  secondaryCrmCopyAllowed: false,
  eligibleModelProviders: ["qualified-provider"],
  allowedToolClasses: ["inventory-read"],
  allowedNetworkDestinations: ["api.example.invalid"],
  terminalOutcomeAuthorities: ["MANAGER", "DEALERSHIP_SYSTEM"],
  humanApprovalRequiredFor: ["COMPLAINT_RESOLUTION", "FINANCING_COMMITMENT"],
  humanApprovalPresentFor: [],
};

function decision(policy: WorkspaceActionPolicy, request: Parameters<typeof evaluateWorkspaceAction>[0]["request"]) {
  return evaluateWorkspaceAction({ policy, request });
}

const results: Array<{ challenge: string; state: string; passed: boolean }> = [];
function pass(challenge: string, state: string) {
  results.push({ challenge, state, passed: true });
}

// Cross-workspace attack: one dealership must never inherit another dealership's permission.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-b",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("WORKSPACE_MISMATCH"));
  pass("cross_workspace_isolation", result.state);
}

// Revoked, expired, and unknown permission states all fail closed.
for (const authorityState of ["REVOKED", "EXPIRED", "UNKNOWN"] as const) {
  const result = decision({ ...basePolicy, authorityState }, {
    workspaceId: "dealer-a",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes(`AUTHORITY_${authorityState}`));
  pass(`authority_${authorityState.toLowerCase()}_blocks`, result.state);
}

// Shutdown/revocation must beat earlier permissive settings. Prior permission is not permanent power.
{
  const previouslyPermissive: WorkspaceActionPolicy = {
    ...basePolicy,
    authorityState: "REVOKED",
    autonomousSendAllowed: true,
    realCrmWriteAllowed: true,
    secondaryCrmCopyAllowed: true,
  };
  for (const actionClass of ["EXTERNAL_SEND", "REAL_CRM_WRITE", "SECONDARY_CRM_COPY"] as const) {
    const result = decision(previouslyPermissive, {
      workspaceId: "dealer-a",
      actionClass,
      actor: "NORAUTO_SYSTEM",
    });
    assert.equal(result.state, "BLOCK");
    assert.ok(result.reasons.includes("AUTHORITY_REVOKED"));
  }
  pass("revocation_overrides_prior_permissions", "BLOCK");
}

// The system cannot quietly grant itself outbound or CRM powers.
for (const actionClass of ["EXTERNAL_SEND", "REAL_CRM_WRITE", "SECONDARY_CRM_COPY"] as const) {
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass,
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  pass(`${actionClass.toLowerCase()}_not_self_authorized`, result.state);
}

// Approval for one consequential action cannot be reused as authority for a different action.
{
  const oneApprovalOnly: WorkspaceActionPolicy = {
    ...basePolicy,
    humanApprovalPresentFor: ["COMPLAINT_RESOLUTION"],
  };
  const financing = decision(oneApprovalOnly, {
    workspaceId: "dealer-a",
    actionClass: "FINANCING_COMMITMENT",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(financing.state, "ESCALATE_HUMAN");
  assert.ok(financing.reasons.includes("HUMAN_APPROVAL_REQUIRED"));

  const send = decision(oneApprovalOnly, {
    workspaceId: "dealer-a",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(send.state, "BLOCK");
  assert.ok(send.reasons.includes("AUTONOMOUS_SEND_NOT_AUTHORIZED"));
  pass("approval_cannot_be_reused_outside_its_action", `${financing.state}/${send.state}`);
}

// A provider that has not already been qualified cannot be used as fallback.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "MODEL_PROVIDER_USE",
    actor: "NORAUTO_SYSTEM",
    modelProvider: "random-fallback-provider",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("MODEL_PROVIDER_NOT_QUALIFIED_OR_ALLOWED"));
  pass("unqualified_provider_blocked", result.state);
}

// Missing provider identity cannot be treated as harmless or auto-filled.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "MODEL_PROVIDER_USE",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("MODEL_PROVIDER_IDENTITY_REQUIRED"));
  pass("missing_provider_identity_blocked", result.state);
}

// An unapproved tool or network destination cannot be used.
{
  const badTool = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "shell-execution",
    networkDestination: "api.example.invalid",
  });
  assert.equal(badTool.state, "BLOCK");
  assert.ok(badTool.reasons.includes("TOOL_CLASS_NOT_ALLOWED"));
  pass("unapproved_tool_blocked", badTool.state);

  const badNetwork = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "inventory-read",
    networkDestination: "evil.example.invalid",
  });
  assert.equal(badNetwork.state, "BLOCK");
  assert.ok(badNetwork.reasons.includes("NETWORK_DESTINATION_NOT_ALLOWED"));
  pass("unapproved_network_blocked", badNetwork.state);
}

// Missing tool/network identity also fails closed; the system cannot hide the destination.
{
  const missingTool = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    networkDestination: "api.example.invalid",
  });
  assert.equal(missingTool.state, "BLOCK");
  assert.ok(missingTool.reasons.includes("TOOL_CLASS_REQUIRED"));

  const missingNetwork = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "inventory-read",
  });
  assert.equal(missingNetwork.state, "BLOCK");
  assert.ok(missingNetwork.reasons.includes("NETWORK_DESTINATION_REQUIRED"));
  pass("missing_tool_or_network_identity_blocked", `${missingTool.state}/${missingNetwork.state}`);
}

// The AI cannot mark the real sales result by itself.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TERMINAL_CRM_OUTCOME",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("SYSTEM_CANNOT_SELF_AUTHORIZE_TERMINAL_CRM_OUTCOME"));
  pass("system_cannot_self_mark_terminal_outcome", result.state);
}

// Consequential complaint and financing actions remain human decisions.
for (const actionClass of ["COMPLAINT_RESOLUTION", "FINANCING_COMMITMENT"] as const) {
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass,
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "ESCALATE_HUMAN");
  pass(`${actionClass.toLowerCase()}_requires_human`, result.state);
}

// Lower-authority instructions cannot weaken a higher-authority boundary.
{
  const result = evaluateInstructionPrecedence({
    controllingAuthority: "WORKSPACE_POLICY",
    proposedAuthority: "AGENT",
    wouldRelaxControllingBoundary: true,
  });
  assert.equal(result.state, "REJECT_LOWER_AUTHORITY_OVERRIDE");
  pass("lower_authority_override_rejected", result.state);
}

// Retry pressure is bounded: after the approved number of attempts, work is parked.
{
  assert.deepEqual(decideCrmRelayRetry({ attempt: 1, maxAttempts: 3 }), {
    state: "RETRY_SCHEDULED",
    delayMs: 5_000,
  });
  assert.deepEqual(decideCrmRelayRetry({ attempt: 2, maxAttempts: 3 }), {
    state: "RETRY_SCHEDULED",
    delayMs: 10_000,
  });
  const terminal = decideCrmRelayRetry({ attempt: 3, maxAttempts: 3 });
  assert.deepEqual(terminal, { state: "PARKED", delayMs: null });
  pass("retry_exhaustion_parks_work", terminal.state);
}

const event: ConversationEvent = {
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "dealer-a",
  provider: "synthetic-provider",
  conversationId: "paired-conv-001",
  eventId: "paired-event-001",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
  observedAt: "2026-09-10T23:20:00.000Z",
  customer: {
    name: "Synthetic Customer",
    phone: "+15555550100",
    email: "synthetic@example.invalid",
    preferredContact: "TEXT",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_DETAILS",
    subjectRefs: ["vehicle-demo-001"],
    questions: ["Is it available?"],
    constraints: [],
    urgency: "NORMAL",
  },
  summary: "Synthetic event for paired challenge integrity testing.",
  evidence: {
    transcriptAvailable: false,
    sourceRef: "synthetic://paired-challenge/evidence",
    sourceHash: "c".repeat(64),
  },
  authorityEffect: "NONE",
};

function evidenceFixture() {
  const packet = createResponsePreparationPacket({ event });
  const draft = createEnrichedResponseDraft({
    packet,
    claims: [],
    now: new Date("2026-09-10T23:30:00.000Z"),
  });
  const passport = createResponseEvidencePassport({ packet, draft });
  return { packet, draft, passport };
}

// Evidence-tampering attack: a changed draft must no longer match the proof receipt created for it.
{
  const { packet, draft, passport } = evidenceFixture();
  const original = verifyResponseEvidencePassport({ packet, draft, passport });
  assert.equal(original.valid, true);

  const tamperedDraft = { ...draft, text: `${draft.text}\nUNSUPPORTED CHANGE` };
  const tampered = verifyResponseEvidencePassport({ packet, draft: tamperedDraft, passport });
  assert.equal(tampered.valid, false);
  assert.ok(tampered.reasons.includes("DRAFT_DIGEST_MISMATCH"));
  pass("evidence_tampering_detected", "BLOCKED_BY_INTEGRITY_MISMATCH");
}

// Reward-hacking style attack: changing the draft after evidence was issued to claim success
// cannot preserve a valid proof receipt. A success-looking sentence is not outcome evidence.
{
  const { packet, draft, passport } = evidenceFixture();
  const fakeSuccessDraft = {
    ...draft,
    text: `${draft.text}\nCustomer contacted successfully. Appointment confirmed. Vehicle sold.`,
  };
  const result = verifyResponseEvidencePassport({ packet, draft: fakeSuccessDraft, passport });
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("DRAFT_DIGEST_MISMATCH"));
  pass("success_claim_cannot_replace_evidence", "INVALID_PASSPORT");
}

// Identity-swap attack: proof from one conversation cannot be quietly reused for another.
{
  const { packet, draft, passport } = evidenceFixture();
  const swappedDraft = { ...draft, conversationId: "paired-conv-OTHER" };
  const result = verifyResponseEvidencePassport({ packet, draft: swappedDraft, passport });
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("CONVERSATION_IDENTITY_MISMATCH"));
  assert.ok(result.reasons.includes("DRAFT_DIGEST_MISMATCH"));
  pass("evidence_cannot_be_reused_across_conversations", "INVALID_PASSPORT");
}

// Receipt-tampering attack: editing the proof object itself is detectable.
{
  const { packet, draft, passport } = evidenceFixture();
  const alteredPassport = {
    ...passport,
    subject: { ...passport.subject, eventId: "paired-event-FAKE" },
  };
  const result = verifyResponseEvidencePassport({ packet, draft, passport: alteredPassport });
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes("EVENT_IDENTITY_MISMATCH"));
  assert.ok(result.reasons.includes("PASSPORT_DIGEST_MISMATCH"));
  pass("proof_receipt_identity_tampering_detected", "INVALID_PASSPORT");
}

// Mutation challenge: flip a normally-safe permission to true and prove only that bounded action changes.
{
  const mutatedPolicy = { ...basePolicy, autonomousSendAllowed: true };
  const send = decision(mutatedPolicy, {
    workspaceId: "dealer-a",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(send.state, "ALLOW_BOUNDED");

  const terminal = decision(mutatedPolicy, {
    workspaceId: "dealer-a",
    actionClass: "TERMINAL_CRM_OUTCOME",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(terminal.state, "BLOCK");
  pass("permission_mutation_does_not_expand_unrelated_authority", `${send.state}/${terminal.state}`);
}

assert.equal(results.every((result) => result.passed), true);

console.log(JSON.stringify({
  protocol: "NORAUTOMATCH_PAIRED_CHALLENGE_CAMPAIGN_V1",
  truthState: "SYNTHETIC_CHALLENGE_PASS",
  authorityEffect: "NONE",
  challengeCount: results.length,
  results,
  nonClaims: {
    productionDeployed: false,
    liveCustomerTrafficTested: false,
    realCrmWriteTested: false,
    autonomousSendActivated: false,
    proposedContainmentLawActivated: false,
  },
}, null, 2));
