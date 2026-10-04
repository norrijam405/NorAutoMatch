import { createResponseDraft } from "../src/lib/conversation-response-draft";
import type { ResponsePreparationPacket } from "../src/lib/conversation-response-preparation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const basePacket: ResponsePreparationPacket = {
  protocol: "NORAUTO_RESPONSE_PREPARATION_PACKET_V1",
  workspaceId: "norautomatch",
  provider: "synthetic-provider",
  eventId: "draft-test-001",
  conversationId: "conversation-draft-001",
  routingDecision: "CONTACTABLE",
  responseState: "RESPONSE_DUE",
  preferredContact: "TEXT",
  communicationConsent: true,
  customerStated: {
    name: "Synthetic Customer",
    subjectRefs: ["stock:123"],
    questions: ["Is this vehicle still available?", "What is the current price?"],
    constraints: [],
    urgency: "NORMAL",
    summary: "Customer asked about a vehicle.",
  },
  safeDraftFrame: {
    opening: "Continue naturally.",
    acknowledgement: "Answer the supplied questions.",
    evidencePlaceholders: ["[VERIFY_AVAILABILITY]", "[VERIFY_PRICE]"],
    closing: "Invite continuation.",
  },
  evidenceRequirements: [],
  outboundExecution: "NOT_PERFORMED",
  deliveryState: "NOT_CLAIMED",
  customerReachedState: "NOT_CLAIMED",
  authorityEffect: "DRAFT_PREPARATION_ONLY",
};

const draft = createResponseDraft(basePacket);
assert(draft.protocol === "NORAUTO_RESPONSE_DRAFT_V1", "Draft protocol must be explicit.");
assert(draft.text.includes("Is this vehicle still available?"), "Customer-stated question must survive into the draft.");
assert(draft.text.includes("[VERIFY_AVAILABILITY]") && draft.text.includes("[VERIFY_PRICE]"), "Unverified mutable facts must remain visible placeholders.");
assert(!draft.text.includes("is available"), "Draft must not invent affirmative availability.");
assert(draft.deliveryEligibility === "REVIEW_REQUIRED", "Consent does not bypass human draft review.");
assert(draft.requiresHumanReview === true, "Every draft must require human review.");
assert(draft.outboundExecution === "NOT_PERFORMED" && draft.deliveryState === "NOT_SENT", "Draft creation must not imply outbound execution.");
assert(draft.authorityEffect === "DRAFT_ONLY", "Draft creation must have draft-only authority.");

const uncertainConsent = createResponseDraft({ ...basePacket, communicationConsent: null });
assert(uncertainConsent.deliveryEligibility === "HUMAN_REVIEW_REQUIRED", "Unproven consent must block ordinary delivery eligibility.");

const noChannel = createResponseDraft({ ...basePacket, preferredContact: null });
assert(noChannel.deliveryEligibility === "NO_CHANNEL", "Missing preferred contact channel must be explicit.");

console.log("PASS_CONVERSATION_RESPONSE_DRAFT_TRUTH_BOUNDARY");
