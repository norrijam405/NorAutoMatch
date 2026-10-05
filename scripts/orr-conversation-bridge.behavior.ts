import assert from "node:assert/strict";
import { normalizeAuthorizedOrrConversation } from "../src/lib/orr-conversation-bridge";

const normalized = normalizeAuthorizedOrrConversation({
  dealerId: 2175,
  dealerDomain: "orrnissanwest.com",
  provider: "RIDEMOTIVE_CHAT",
  externalConversationId: "conversation-80984",
  externalEventId: "event-001",
  observedAt: "2026-10-04T23:00:10.000Z",
  message: "looking for a new rogue",
  vehicleId: null,
  customer: {
    name: null,
    phone: null,
    email: null,
    preferredContact: null,
    communicationConsent: null,
  },
  sourceRef: "authorized-provider://orr/chat/thread",
  sourceHash: "b".repeat(64),
});

assert.equal(normalized.workspaceId, "norautomatch");
assert.equal(normalized.provider, "RIDEMOTIVE_CHAT");
assert.equal(normalized.authorityEffect, "NONE");
assert.deepEqual(normalized.intent.questions, ["looking for a new rogue"]);
assert.equal(normalized.intent.category, "SHOPPING_ASSISTANCE");

assert.throws(() => normalizeAuthorizedOrrConversation({
  dealerId: 9999 as 2175,
  dealerDomain: "orrnissanwest.com",
  provider: "RIDEMOTIVE_CHAT",
  externalConversationId: "x",
  externalEventId: "y",
  observedAt: "2026-10-04T23:00:10.000Z",
  message: "hello",
  customer: { name: null, phone: null, email: null, preferredContact: null, communicationConsent: null },
  sourceRef: "authorized-provider://wrong",
  sourceHash: "c".repeat(64),
}), /invalid_literal|Invalid literal|Invalid input/i);

console.log("PASS Orr conversation normalization boundary");
