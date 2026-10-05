import assert from "node:assert/strict";
import { buildAskTorqueConversationEvent } from "../src/lib/ask-torque-intake";

const base = {
  conversationId: "f322d60e-a2d8-4ae0-a551-96dddf10d481",
  messageId: "fd2ce0b7-c374-4697-8e92-00ef7ba84d56",
  accessToken: "abcdefghijklmnopqrstuvwxABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-abcd",
  message: "Do you have a Rogue SV in stock?",
  vehicleVin: null,
  customer: {
    name: "Synthetic Customer",
    email: "customer@example.invalid",
    phone: null,
    preferredContact: "EMAIL" as const,
    communicationConsent: true,
  },
};

const event = buildAskTorqueConversationEvent(base, "2026-10-05T06:30:00.000Z");
assert.equal(event.workspaceId, "norautomatch");
assert.equal(event.provider, "NORAUTO_SITE_CHAT");
assert.equal(event.intent.questions[0], base.message);
assert.equal(event.customer.communicationConsent, true);
assert.match(event.evidence.sourceHash ?? "", /^[a-f0-9]{64}$/);
assert.equal(event.authorityEffect, "NONE");

const again = buildAskTorqueConversationEvent(base, "2026-10-05T06:30:00.000Z");
assert.equal(event.evidence.sourceHash, again.evidence.sourceHash);
assert.equal(event.eventId, again.eventId);

assert.throws(() => buildAskTorqueConversationEvent({
  ...base,
  customer: { ...base.customer, email: null, preferredContact: "EMAIL" },
}, "2026-10-05T06:30:00.000Z"), /EMAIL_CONTACT_REQUIRES_EMAIL/);

assert.throws(() => buildAskTorqueConversationEvent({
  ...base,
  customer: { ...base.customer, preferredContact: null, communicationConsent: true },
}, "2026-10-05T06:30:00.000Z"), /CONSENT_REQUIRES_PREFERRED_CONTACT/);

console.log("PASS Ask Torque public intake normalization boundary");
