import assert from "node:assert/strict";
import type { ConversationEvent } from "../src/lib/conversation-gateway";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";
import { createResponseDraft } from "../src/lib/conversation-response-draft";
import {
  evaluateWorkspaceAction,
  type WorkspaceActionPolicy,
} from "../src/lib/workspace-policy-runtime";

const workspaceId = "torque-green-room-synthetic-v1";

function policy(overrides: Partial<WorkspaceActionPolicy> = {}): WorkspaceActionPolicy {
  return {
    workspaceId,
    authorityState: "ACTIVE",
    autonomousSendAllowed: false,
    realCrmWriteAllowed: false,
    secondaryCrmCopyAllowed: false,
    eligibleModelProviders: ["qualified-synthetic-provider"],
    allowedToolClasses: ["synthetic-fixture-reader"],
    allowedNetworkDestinations: [],
    terminalOutcomeAuthorities: ["MANAGER", "DEALERSHIP_SYSTEM"],
    humanApprovalRequiredFor: ["EXTERNAL_SEND", "REAL_CRM_WRITE", "COMPLAINT_RESOLUTION", "FINANCING_COMMITMENT"],
    humanApprovalPresentFor: [],
    ...overrides,
  };
}

function conversation(overrides: Partial<ConversationEvent> = {}): ConversationEvent {
  const base: ConversationEvent = {
    protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
    workspaceId,
    provider: "synthetic-provider",
    conversationId: "conv-synthetic-001",
    eventId: "event-synthetic-001",
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
      category: "FINANCING",
      subjectRefs: ["vehicle-demo-001"],
      questions: ["Am I approved and what rate will I get?"],
      constraints: [],
      urgency: "NORMAL",
    },
    summary: "Synthetic financing question for Green Room only.",
    evidence: {
      transcriptAvailable: false,
      sourceRef: "synthetic://torque-green-room",
      sourceHash: "a".repeat(64),
    },
    authorityEffect: "NONE",
  };
  return { ...base, ...overrides };
}

// TQ-004: draft preparation cannot be represented as transmission, delivery, or customer reach.
const packet = createResponsePreparationPacket({ event: conversation() });
const draft = createResponseDraft(packet);
assert.equal(packet.outboundExecution, "NOT_PERFORMED");
assert.equal(packet.deliveryState, "NOT_CLAIMED");
assert.equal(packet.customerReachedState, "NOT_CLAIMED");
assert.equal(draft.outboundExecution, "NOT_PERFORMED");
assert.equal(draft.deliveryState, "NOT_SENT");
assert.equal(draft.customerReachedState, "NOT_CLAIMED");
assert.equal(draft.requiresHumanReview, true);

// TQ-011: financing questions require current evidence and consequential commitment remains human-gated.
assert.ok(packet.evidenceRequirements.some((requirement) => requirement.topic === "FINANCING"));
const financingDecision = evaluateWorkspaceAction({
  policy: policy(),
  request: { workspaceId, actionClass: "FINANCING_COMMITMENT", actor: "NORAUTO_SYSTEM" },
});
assert.equal(financingDecision.state, "ESCALATE_HUMAN");
assert.ok(financingDecision.reasons.includes("HUMAN_APPROVAL_REQUIRED"));

// TQ-012: mismatched workspace identity fails closed before any action-specific allowance.
const crossTenant = evaluateWorkspaceAction({
  policy: policy(),
  request: {
    workspaceId: "other-synthetic-workspace",
    actionClass: "MODEL_PROVIDER_USE",
    actor: "NORAUTO_SYSTEM",
    modelProvider: "qualified-synthetic-provider",
  },
});
assert.equal(crossTenant.state, "BLOCK");
assert.deepEqual(crossTenant.reasons, ["WORKSPACE_MISMATCH"]);

// TQ-013: secondary CRM copy remains denied when the workspace pack does not authorize it.
const secondaryCopy = evaluateWorkspaceAction({
  policy: policy(),
  request: { workspaceId, actionClass: "SECONDARY_CRM_COPY", actor: "NORAUTO_SYSTEM" },
});
assert.equal(secondaryCopy.state, "BLOCK");
assert.deepEqual(secondaryCopy.reasons, ["SECONDARY_CRM_COPY_NOT_AUTHORIZED"]);

// TQ-016: a cheaper/available but unqualified model provider may not be used as fallback.
const unqualifiedProvider = evaluateWorkspaceAction({
  policy: policy(),
  request: {
    workspaceId,
    actionClass: "MODEL_PROVIDER_USE",
    actor: "NORAUTO_SYSTEM",
    modelProvider: "cheap-unqualified-provider",
  },
});
assert.equal(unqualifiedProvider.state, "BLOCK");
assert.deepEqual(unqualifiedProvider.reasons, ["MODEL_PROVIDER_NOT_QUALIFIED_OR_ALLOWED"]);

const qualifiedProvider = evaluateWorkspaceAction({
  policy: policy(),
  request: {
    workspaceId,
    actionClass: "MODEL_PROVIDER_USE",
    actor: "NORAUTO_SYSTEM",
    modelProvider: "qualified-synthetic-provider",
  },
});
assert.equal(qualifiedProvider.state, "ALLOW_BOUNDED");

// TQ-018: authority revocation dominates otherwise eligible action paths.
const revoked = evaluateWorkspaceAction({
  policy: policy({ authorityState: "REVOKED", autonomousSendAllowed: true, humanApprovalRequiredFor: [] }),
  request: { workspaceId, actionClass: "EXTERNAL_SEND", actor: "NORAUTO_SYSTEM" },
});
assert.equal(revoked.state, "BLOCK");
assert.deepEqual(revoked.reasons, ["AUTHORITY_REVOKED"]);

// TQ-019: the system may not self-expand into an unlisted tool or network destination.
const unlistedTool = evaluateWorkspaceAction({
  policy: policy({ humanApprovalRequiredFor: [] }),
  request: {
    workspaceId,
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "real-crm-writer",
    networkDestination: "https://crm.example.invalid",
  },
});
assert.equal(unlistedTool.state, "BLOCK");
assert.deepEqual(unlistedTool.reasons, ["TOOL_CLASS_NOT_ALLOWED"]);

const unlistedNetwork = evaluateWorkspaceAction({
  policy: policy({ humanApprovalRequiredFor: [] }),
  request: {
    workspaceId,
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "synthetic-fixture-reader",
    networkDestination: "https://crm.example.invalid",
  },
});
assert.equal(unlistedNetwork.state, "BLOCK");
assert.deepEqual(unlistedNetwork.reasons, ["NETWORK_DESTINATION_NOT_ALLOWED"]);

// Consequential complaint resolution remains escalation even if generic approval arrays are permissive.
const complaintResolution = evaluateWorkspaceAction({
  policy: policy({ humanApprovalRequiredFor: [], humanApprovalPresentFor: [] }),
  request: { workspaceId, actionClass: "COMPLAINT_RESOLUTION", actor: "NORAUTO_SYSTEM" },
});
assert.equal(complaintResolution.state, "ESCALATE_HUMAN");
assert.deepEqual(complaintResolution.reasons, ["CONSEQUENTIAL_HUMAN_AUTHORITY_REQUIRED"]);

console.log("Torque workspace authority challenge tranche: PASS");
