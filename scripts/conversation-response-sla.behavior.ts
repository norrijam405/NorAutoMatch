import { conversationEventSchema, evaluateConversationRouting } from "../src/lib/conversation-gateway";
import {
  createConversationResponseObligation,
  FIRST_RESPONSE_TARGET_SECONDS,
  FIRST_RESPONSE_WARNING_SECONDS,
} from "../src/lib/conversation-response-sla";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base = conversationEventSchema.parse({
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "norautomatch",
  provider: "motive-ask-ai",
  conversationId: "synthetic-sla-conversation",
  eventId: "synthetic-sla-event",
  eventType: "LEAD_DELIVERED_TO_CRM",
  observedAt: "2026-09-10T09:00:00.000Z",
  customer: {
    name: "Synthetic SLA Customer",
    phone: "4055550197",
    email: null,
    preferredContact: "TEXT",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["synthetic-stock-sla"],
    questions: ["Can you confirm availability?"],
    constraints: [],
    urgency: "HIGH",
  },
  summary: "Synthetic SLA test.",
  evidence: { transcriptAvailable: false, sourceRef: "synthetic:sla", sourceHash: null },
  authorityEffect: "NONE",
});

assert(FIRST_RESPONSE_WARNING_SECONDS === 120, "Response warning must represent the two-minute edge of the operating target.");
assert(FIRST_RESPONSE_TARGET_SECONDS === 180, "Response target must represent the three-minute maximum service target.");

const due = createConversationResponseObligation({ event: base, routing: evaluateConversationRouting(base) });
assert(due.state === "RESPONSE_DUE", "Contactable conversation must create a response obligation.");
assert(due.warningAt === "2026-09-10T09:02:00.000Z", "Warning boundary must be exactly two minutes after source observation.");
assert(due.targetAt === "2026-09-10T09:03:00.000Z", "Target boundary must be exactly three minutes after source observation.");
assert(due.authorityEffect === "NONE", "Response obligation must not grant contact or outcome authority.");

const uncertain = conversationEventSchema.parse({
  ...base,
  eventId: "synthetic-sla-review",
  customer: { ...base.customer, communicationConsent: null },
});
const review = createConversationResponseObligation({ event: uncertain, routing: evaluateConversationRouting(uncertain) });
assert(review.state === "HUMAN_REVIEW_DUE", "Unproven communication consent must create review, not autonomous response authority.");
assert(review.targetAt === "2026-09-10T09:03:00.000Z", "Human review should retain the same speed target.");

const noRoute = conversationEventSchema.parse({
  ...base,
  eventId: "synthetic-sla-no-route",
  customer: { ...base.customer, phone: null, email: null },
});
const blocked = createConversationResponseObligation({ event: noRoute, routing: evaluateConversationRouting(noRoute) });
assert(blocked.state === "NO_RESPONSE_ROUTE", "No contact route must not manufacture an actionable response obligation.");
assert(blocked.warningAt === null && blocked.targetAt === null, "No-route state must not pretend an outbound response can be made.");

console.log("PASS_CONVERSATION_RESPONSE_TWO_TO_THREE_MINUTE_SLA");
