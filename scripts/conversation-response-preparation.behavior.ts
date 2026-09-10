import { conversationEventSchema, evaluateConversationRouting } from "../src/lib/conversation-gateway";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const contactable = conversationEventSchema.parse({
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "norautomatch",
  provider: "synthetic-provider",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
  eventId: "synthetic-prep-001",
  conversationId: "synthetic-prep-conversation-001",
  observedAt: "2026-09-10T10:00:00.000Z",
  customer: {
    name: "Synthetic Customer",
    phone: "4055550100",
    email: "synthetic@example.com",
    preferredContact: "TEXT",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["stock:synthetic-123"],
    questions: ["Is it still available?", "What would my payment be?"],
    constraints: ["Wants to stay near $500/month."],
    urgency: "HIGH",
  },
  summary: "Customer asked about a specific vehicle and payment target.",
  evidence: {
    transcriptAvailable: false,
    sourceRef: "synthetic:response-preparation",
    sourceHash: "d".repeat(64),
  },
  authorityEffect: "NONE",
});

const routing = evaluateConversationRouting(contactable);
const packet = createResponsePreparationPacket({ event: contactable, routing });

assert(packet.protocol === "NORAUTO_RESPONSE_PREPARATION_PACKET_V1", "Preparation protocol drifted.");
assert(packet.routingDecision === "CONTACTABLE", "Contactable customer routing was lost.");
assert(packet.responseState === "RESPONSE_DUE", "Contactable event must remain a response obligation, not a delivery claim.");
assert(packet.communicationConsent === true, "Consent evidence must be preserved exactly.");
assert(packet.customerStated.questions.length === 2, "Customer questions must be preserved without summarizing them away.");
assert(packet.outboundExecution === "NOT_PERFORMED", "Preparation must never claim an outbound action occurred.");
assert(packet.deliveryState === "NOT_CLAIMED", "Preparation must never claim delivery.");
assert(packet.customerReachedState === "NOT_CLAIMED", "Preparation must never claim customer reach.");
assert(packet.authorityEffect === "DRAFT_PREPARATION_ONLY", "Preparation packet must not acquire CRM/deal authority.");

for (const topic of ["AVAILABILITY", "PRICE", "INCENTIVES", "FINANCING", "RESERVATION", "APPOINTMENT"] as const) {
  const requirement = packet.evidenceRequirements.find((item) => item.topic === topic);
  assert(requirement?.state === "REQUIRES_CURRENT_EVIDENCE", `${topic} must remain evidence-gated.`);
  assert(packet.safeDraftFrame.evidencePlaceholders.includes(`[VERIFY_${topic}]`), `${topic} verification placeholder is missing.`);
}

assert(!JSON.stringify(packet).includes("AVAILABLE_CONFIRMED"), "Draft preparation must not manufacture availability confirmation.");
assert(!JSON.stringify(packet).includes("FINANCING_APPROVED"), "Draft preparation must not manufacture financing approval.");
assert(!JSON.stringify(packet).includes("APPOINTMENT_SET"), "Draft preparation must not manufacture CRM appointment state.");
assert(!JSON.stringify(packet).includes("SOLD"), "Draft preparation must not manufacture sale state.");

const reviewEvent = conversationEventSchema.parse({
  ...contactable,
  eventId: "synthetic-prep-002",
  conversationId: "synthetic-prep-conversation-002",
  customer: { ...contactable.customer, communicationConsent: null },
});
const reviewPacket = createResponsePreparationPacket({ event: reviewEvent });
assert(reviewPacket.routingDecision === "HUMAN_REVIEW_REQUIRED", "Unknown consent must remain human-review required.");
assert(reviewPacket.responseState === "HUMAN_REVIEW_DUE", "Unknown consent must not become response permission.");
assert(reviewPacket.communicationConsent === null, "Unknown consent must remain null.");
assert(reviewPacket.outboundExecution === "NOT_PERFORMED", "Human-review packet still cannot send anything.");

console.log("PASS_CONVERSATION_RESPONSE_PREPARATION_TRUTH_BOUNDARY");
