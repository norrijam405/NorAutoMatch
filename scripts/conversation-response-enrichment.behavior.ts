import { strict as assert } from "node:assert";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";
import { createEnrichedResponseDraft } from "../src/lib/conversation-response-enrichment";
import { RESPONSE_EVIDENCE_CLAIM_PROTOCOL, type ResponseEvidenceClaim } from "../src/lib/response-evidence-claim";
import type { ConversationEvent } from "../src/lib/conversation-gateway";

const now = new Date("2026-09-10T17:00:00.000Z");
const event: ConversationEvent = {
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "workspace-test",
  provider: "TEST_PROVIDER",
  eventId: "evt-1",
  conversationId: "conv-1",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
  observedAt: "2026-09-10T16:59:00.000Z",
  customer: {
    name: "Alex",
    email: "alex@example.com",
    phone: "+14055550100",
    preferredContact: "TEXT",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["stock-123"],
    questions: ["Is it available?", "What is the price?"],
    constraints: [],
    urgency: "HIGH",
  },
  summary: "Customer asked about current availability and price.",
  evidence: {
    transcriptAvailable: true,
    sourceRef: "provider:event:evt-1",
    sourceHash: null,
  },
  authorityEffect: "NONE",
};

const packet = createResponsePreparationPacket({ event });

const claim = (partial: Partial<ResponseEvidenceClaim> & Pick<ResponseEvidenceClaim, "topic" | "value">): ResponseEvidenceClaim => ({
  protocol: RESPONSE_EVIDENCE_CLAIM_PROTOCOL,
  workspaceId: "workspace-test",
  sourceType: "AUTHORIZED_INVENTORY",
  sourceRef: `inventory:${partial.topic}`,
  observedAt: "2026-09-10T16:58:00.000Z",
  validUntil: partial.topic === "AVAILABILITY" ? "2026-09-10T17:10:00.000Z" : "2026-09-11T16:58:00.000Z",
  evidenceState: "VERIFIED_CURRENT",
  ...partial,
});

const enriched = createEnrichedResponseDraft({
  packet,
  claims: [
    claim({ topic: "AVAILABILITY", value: "Available in current authorized inventory" }),
    claim({ topic: "PRICE", value: "$31,995 before applicable taxes and fees" }),
  ],
  now,
});

assert.equal(enriched.deliveryState, "NOT_SENT");
assert.equal(enriched.customerReachedState, "NOT_CLAIMED");
assert.equal(enriched.requiresHumanReview, true);
assert.equal(enriched.authorityEffect, "DRAFT_WITH_EVIDENCE_ONLY");
assert.equal(enriched.mutableFactState, "PARTIALLY_VERIFIED");
assert.ok(enriched.text.includes("Current availability: Available in current authorized inventory"));
assert.ok(enriched.text.includes("Current price: $31,995 before applicable taxes and fees"));
assert.ok(!enriched.unresolvedEvidence.includes("[VERIFY_AVAILABILITY]"));
assert.ok(!enriched.unresolvedEvidence.includes("[VERIFY_PRICE]"));
assert.ok(enriched.unresolvedEvidence.includes("[VERIFY_INCENTIVES]"));
assert.equal(enriched.evidenceUsed.length, 2);

const expired = createEnrichedResponseDraft({
  packet,
  claims: [
    claim({
      topic: "AVAILABILITY",
      value: "Available",
      observedAt: "2026-09-10T16:30:00.000Z",
      validUntil: "2026-09-10T16:45:00.000Z",
    }),
  ],
  now,
});
assert.equal(expired.mutableFactState, "NO_VALID_CURRENT_EVIDENCE");
assert.ok(expired.unresolvedEvidence.includes("[VERIFY_AVAILABILITY]"));
assert.equal(expired.rejectedEvidence[0]?.reason, "EXPIRED");

const wrongWorkspace = createEnrichedResponseDraft({
  packet,
  claims: [claim({ topic: "PRICE", value: "$1", workspaceId: "other-workspace" })],
  now,
});
assert.equal(wrongWorkspace.evidenceUsed.length, 0);
assert.equal(wrongWorkspace.rejectedEvidence[0]?.reason, "WORKSPACE_MISMATCH");

const tooLongAvailabilityTtl = createEnrichedResponseDraft({
  packet,
  claims: [claim({
    topic: "AVAILABILITY",
    value: "Available",
    observedAt: "2026-09-10T16:58:00.000Z",
    validUntil: "2026-09-10T17:30:00.000Z",
  })],
  now,
});
assert.equal(tooLongAvailabilityTtl.evidenceUsed.length, 0);
assert.equal(tooLongAvailabilityTtl.rejectedEvidence[0]?.reason, "TTL_TOO_LONG");

const malformed = createEnrichedResponseDraft({ packet, claims: [{ topic: "PRICE" }], now });
assert.equal(malformed.evidenceUsed.length, 0);
assert.equal(malformed.rejectedEvidence[0]?.reason, "INVALID_SHAPE");

console.log("PASS_CONVERSATION_RESPONSE_ENRICHMENT_TRUTH_BOUNDARY");
