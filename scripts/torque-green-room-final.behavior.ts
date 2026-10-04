import assert from "node:assert/strict";
import { evaluateInstructionPrecedence } from "../src/lib/authority-precedence";
import {
  createCustomerCommitment,
  deriveCustomerCommitmentState,
  satisfyCustomerCommitment,
} from "../src/lib/customer-commitment";
import { decideCrmRelayRetry, crmRelayRetryDelayMs } from "../src/lib/crm-relay-retry-policy";
import type { ConversationEvent } from "../src/lib/conversation-gateway";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";
import { createEnrichedResponseDraft } from "../src/lib/conversation-response-enrichment";
import { createResponseEvidencePassport } from "../src/lib/evidence-passport";
import { verifyResponseEvidencePassport } from "../src/lib/evidence-passport-verifier";
import { validateResponseEvidenceClaim } from "../src/lib/response-evidence-claim";

const workspaceId = "torque-green-room-synthetic-v1";
const now = new Date("2026-09-10T23:30:00.000Z");

function conversation(): ConversationEvent {
  return {
    protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
    workspaceId,
    provider: "synthetic-provider",
    conversationId: "conv-final-001",
    eventId: "event-final-001",
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
      questions: ["Is it available and what is the price?"],
      constraints: [],
      urgency: "NORMAL",
    },
    summary: "Synthetic mutable-fact request for final Torque Green Room tranche.",
    evidence: {
      transcriptAvailable: false,
      sourceRef: "synthetic://torque-green-room/final",
      sourceHash: "b".repeat(64),
    },
    authorityEffect: "NONE",
  };
}

// TQ-002: stale mutable evidence is rejected rather than promoted as current truth.
const expiredAvailability = validateResponseEvidenceClaim({
  expectedWorkspaceId: workspaceId,
  now,
  claim: {
    protocol: "NORAUTO_RESPONSE_EVIDENCE_CLAIM_V1",
    workspaceId,
    topic: "AVAILABILITY",
    value: "In stock",
    sourceType: "AUTHORIZED_INVENTORY",
    sourceRef: "synthetic://inventory/stale",
    observedAt: "2026-09-10T22:00:00.000Z",
    validUntil: "2026-09-10T22:15:00.000Z",
    evidenceState: "VERIFIED_CURRENT",
  },
});
assert.deepEqual(expiredAvailability, { valid: false, reason: "EXPIRED" });

const overlongPriceTtl = validateResponseEvidenceClaim({
  expectedWorkspaceId: workspaceId,
  now,
  claim: {
    protocol: "NORAUTO_RESPONSE_EVIDENCE_CLAIM_V1",
    workspaceId,
    topic: "PRICE",
    value: "$25,000",
    sourceType: "DEALERSHIP_MANAGER",
    sourceRef: "synthetic://manager/price",
    observedAt: "2026-09-10T23:00:00.000Z",
    validUntil: "2026-09-12T23:00:00.000Z",
    evidenceState: "VERIFIED_CURRENT",
  },
});
assert.deepEqual(overlongPriceTtl, { valid: false, reason: "TTL_TOO_LONG" });

// TQ-014: retry pressure is bounded, backoff is capped, and terminal exhaustion parks the event.
assert.equal(crmRelayRetryDelayMs(1), 5_000);
assert.equal(crmRelayRetryDelayMs(9), 900_000);
assert.equal(crmRelayRetryDelayMs(20), 900_000);
assert.deepEqual(decideCrmRelayRetry({ attempt: 1, maxAttempts: 3 }), { state: "RETRY_SCHEDULED", delayMs: 5_000 });
assert.deepEqual(decideCrmRelayRetry({ attempt: 2, maxAttempts: 3 }), { state: "RETRY_SCHEDULED", delayMs: 10_000 });
assert.deepEqual(decideCrmRelayRetry({ attempt: 3, maxAttempts: 3 }), { state: "PARKED", delayMs: null });
assert.throws(() => decideCrmRelayRetry({ attempt: 0, maxAttempts: 3 }), /positive integer/);

// TQ-017: Evidence Passport integrity verification detects source/draft tampering.
const packet = createResponsePreparationPacket({ event: conversation() });
const enriched = createEnrichedResponseDraft({ packet, claims: [], now });
const passport = createResponseEvidencePassport({ packet, draft: enriched });
const validPassport = verifyResponseEvidencePassport({ packet, draft: enriched, passport });
assert.equal(validPassport.valid, true);
assert.deepEqual(validPassport.reasons, []);

const tamperedDraft = { ...enriched, text: `${enriched.text}\nUNSUPPORTED CURRENT PRICE: $1` };
const tamperedDraftCheck = verifyResponseEvidencePassport({ packet, draft: tamperedDraft, passport });
assert.equal(tamperedDraftCheck.valid, false);
assert.ok(tamperedDraftCheck.reasons.includes("DRAFT_DIGEST_MISMATCH"));

const tamperedPassport = {
  ...passport,
  evidence: { ...passport.evidence, unresolvedEvidence: [] },
};
const tamperedPassportCheck = verifyResponseEvidencePassport({ packet, draft: enriched, passport: tamperedPassport });
assert.equal(tamperedPassportCheck.valid, false);
assert.ok(tamperedPassportCheck.reasons.includes("PASSPORT_DIGEST_MISMATCH"));

// TQ-021: promise creation/clock state/attempt do not equal fulfillment; explicit completion evidence does.
const commitment = createCustomerCommitment({
  workspaceId,
  opportunityId: "torque_synthetic_001",
  type: "PERSONALIZED_VIDEO",
  summary: "Send personalized walkaround video",
  createdAt: "2026-09-10T23:00:00.000Z",
  dueAt: "2026-09-10T23:15:00.000Z",
  createdFromEvidenceRef: "evidence:synthetic-promise",
});
assert.equal(commitment.state, "PENDING");
const overdue = deriveCustomerCommitmentState({ obligation: commitment, now: "2026-09-10T23:30:00.000Z" });
assert.equal(overdue.state, "OVERDUE");
assert.equal(overdue.completion, undefined);
assert.throws(
  () => satisfyCustomerCommitment({
    obligation: overdue,
    workspaceId,
    completedAt: "2026-09-10T23:31:00.000Z",
    completionEvidenceRef: "evidence:attempt-only",
    authority: "NORAUTO_SYSTEM",
    evidenceKind: "ATTEMPT_ONLY",
  }),
  /explicit completion evidence/,
);
const satisfied = satisfyCustomerCommitment({
  obligation: overdue,
  workspaceId,
  completedAt: "2026-09-10T23:32:00.000Z",
  completionEvidenceRef: "evidence:video-completion-confirmed",
  authority: "MANAGER",
  evidenceKind: "COMPLETION_CONFIRMED",
});
assert.equal(satisfied.state, "SATISFIED");
assert.equal(satisfied.completion?.evidenceRef, "evidence:video-completion-confirmed");
assert.throws(
  () => satisfyCustomerCommitment({
    obligation: commitment,
    workspaceId: "other-workspace",
    completedAt: "2026-09-10T23:32:00.000Z",
    completionEvidenceRef: "evidence:wrong-workspace",
    authority: "MANAGER",
    evidenceKind: "COMPLETION_CONFIRMED",
  }),
  /cross-workspace/,
);

// TQ-022: lower-authority instructions cannot relax workspace/constitutional boundaries.
const customerOverride = evaluateInstructionPrecedence({
  controllingAuthority: "WORKSPACE_POLICY",
  proposedAuthority: "CUSTOMER",
  wouldRelaxControllingBoundary: true,
});
assert.equal(customerOverride.state, "REJECT_LOWER_AUTHORITY_OVERRIDE");
assert.equal(customerOverride.reason, "LOWER_AUTHORITY_CANNOT_RELAX_HIGHER_AUTHORITY_BOUNDARY");

const agentOverride = evaluateInstructionPrecedence({
  controllingAuthority: "HUMAN_GRANT",
  proposedAuthority: "AGENT",
  wouldRelaxControllingBoundary: true,
});
assert.equal(agentOverride.state, "REJECT_LOWER_AUTHORITY_OVERRIDE");

const harmlessCustomerInstruction = evaluateInstructionPrecedence({
  controllingAuthority: "WORKSPACE_POLICY",
  proposedAuthority: "CUSTOMER",
  wouldRelaxControllingBoundary: false,
});
assert.equal(harmlessCustomerInstruction.state, "ACCEPT_WITHIN_BOUNDARY");

console.log("Torque final Green Room challenge tranche: PASS");
