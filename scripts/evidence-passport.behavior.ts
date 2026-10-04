import { strict as assert } from "node:assert";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";
import { createEnrichedResponseDraft } from "../src/lib/conversation-response-enrichment";
import { createResponseEvidencePassport } from "../src/lib/evidence-passport";
import { RESPONSE_EVIDENCE_CLAIM_PROTOCOL } from "../src/lib/response-evidence-claim";
import type { ConversationEvent } from "../src/lib/conversation-gateway";

const event: ConversationEvent = {
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "workspace-passport",
  provider: "TEST_PROVIDER",
  eventId: "evt-passport-1",
  conversationId: "conv-passport-1",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
  observedAt: "2026-09-10T19:20:00.000Z",
  customer: {
    name: "Jordan",
    email: "jordan@example.com",
    phone: "+14055550111",
    preferredContact: "TEXT",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["stock-passport"],
    questions: ["Is it available?"],
    constraints: [],
    urgency: "HIGH",
  },
  summary: "Customer asked about current availability.",
  evidence: {
    transcriptAvailable: true,
    sourceRef: "provider:event:evt-passport-1",
    sourceHash: "sha256:example",
  },
  authorityEffect: "NONE",
};

const packet = createResponsePreparationPacket({ event });
const draft = createEnrichedResponseDraft({
  packet,
  now: new Date("2026-09-10T19:22:00.000Z"),
  claims: [{
    protocol: RESPONSE_EVIDENCE_CLAIM_PROTOCOL,
    workspaceId: "workspace-passport",
    topic: "AVAILABILITY",
    value: "Available in current authorized inventory",
    sourceType: "AUTHORIZED_INVENTORY",
    sourceRef: "inventory:stock-passport:2026-09-10T19:21Z",
    observedAt: "2026-09-10T19:21:00.000Z",
    validUntil: "2026-09-10T19:30:00.000Z",
    evidenceState: "VERIFIED_CURRENT",
  }],
});

const first = createResponseEvidencePassport({ packet, draft });
const second = createResponseEvidencePassport({ packet, draft });

assert.equal(first.protocol, "IGNIAQUA_EVIDENCE_PASSPORT_V1");
assert.equal(first.truthState, "EVIDENCE_BOUND_DRAFT_ONLY");
assert.equal(first.execution.outboundExecution, "NOT_PERFORMED");
assert.equal(first.execution.deliveryState, "NOT_SENT");
assert.equal(first.execution.customerReachedState, "NOT_CLAIMED");
assert.equal(first.authority.authorityEffect, "DRAFT_WITH_EVIDENCE_ONLY");
assert.equal(first.authority.terminalOutcomeAuthority, "NONE");
assert.equal(first.authority.humanReviewRequired, true);
assert.equal(first.evidence.acceptedMutableClaims.length, 1);
assert.equal(first.evidence.sourceRefs[0], "inventory:stock-passport:2026-09-10T19:21Z");
assert.match(first.integrity.preparationDigestSha256, /^[a-f0-9]{64}$/);
assert.match(first.integrity.draftDigestSha256, /^[a-f0-9]{64}$/);
assert.match(first.integrity.passportDigestSha256, /^[a-f0-9]{64}$/);
assert.equal(first.passportId, second.passportId);
assert.equal(first.integrity.passportDigestSha256, second.integrity.passportDigestSha256);

const wrongPacket = { ...packet, workspaceId: "other-workspace" };
assert.throws(() => createResponseEvidencePassport({ packet: wrongPacket, draft }), /cross-workspace/);

const wrongIdentity = { ...packet, eventId: "different-event" };
assert.throws(() => createResponseEvidencePassport({ packet: wrongIdentity, draft }), /mismatched conversation identity/);

console.log("PASS_EVIDENCE_PASSPORT_INTEGRITY_BOUNDARY");
