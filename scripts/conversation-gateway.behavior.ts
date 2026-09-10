import { conversationEventSchema, evaluateConversationRouting } from "../src/lib/conversation-gateway";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base = {
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1" as const,
  workspaceId: "norautomatch",
  provider: "motive-ask-ai",
  conversationId: "synthetic-conversation-001",
  eventId: "synthetic-event-001",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY" as const,
  observedAt: "2026-09-10T08:45:00.000Z",
  customer: {
    name: "Synthetic Customer",
    phone: "4055550199",
    email: "synthetic@example.com",
    preferredContact: "TEXT" as const,
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["synthetic-stock-001"],
    questions: ["Is this vehicle currently available?"],
    constraints: [],
    urgency: "NORMAL" as const,
  },
  summary: "Synthetic customer asked about current vehicle availability.",
  evidence: {
    transcriptAvailable: false,
    sourceRef: "synthetic:motive:conversation:001",
    sourceHash: "a".repeat(64),
  },
  authorityEffect: "NONE" as const,
};

const valid = conversationEventSchema.parse(base);
const contactable = evaluateConversationRouting(valid);
assert(contactable.decision === "CONTACTABLE", "Consent plus contact route and context should be contactable.");
assert(contactable.authorityEffect === "NONE", "Conversation routing must never grant business authority.");

const noConsent = conversationEventSchema.parse({
  ...base,
  eventId: "synthetic-event-002",
  customer: { ...base.customer, communicationConsent: null },
});
const review = evaluateConversationRouting(noConsent);
assert(review.decision === "HUMAN_REVIEW_REQUIRED", "Unproven communication consent must block automatic contactability.");
assert(review.reasons.includes("COMMUNICATION_CONSENT_NOT_PROVEN"), "Consent uncertainty must be explicit.");

const noRoute = conversationEventSchema.parse({
  ...base,
  eventId: "synthetic-event-003",
  customer: { ...base.customer, phone: null, email: null },
});
const blocked = evaluateConversationRouting(noRoute);
assert(blocked.decision === "NOT_CONTACTABLE", "Missing contact route must fail closed.");

let authorityEscalationRejected = false;
try {
  conversationEventSchema.parse({ ...base, authorityEffect: "CONTACT_CUSTOMER" });
} catch {
  authorityEscalationRejected = true;
}
assert(authorityEscalationRejected, "Provider conversation input must not be able to grant authority.");

let badHashRejected = false;
try {
  conversationEventSchema.parse({
    ...base,
    evidence: { ...base.evidence, sourceHash: "not-a-sha" },
  });
} catch {
  badHashRejected = true;
}
assert(badHashRejected, "Malformed evidence hash must fail validation.");

console.log("PASS_CONVERSATION_GATEWAY_TRUTH_BOUNDARY");
