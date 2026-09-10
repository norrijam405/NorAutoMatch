import type { ResponsePreparationPacket } from "./conversation-response-preparation";

export const RESPONSE_DRAFT_PROTOCOL = "NORAUTO_RESPONSE_DRAFT_V1" as const;

export type ResponseDraft = {
  protocol: typeof RESPONSE_DRAFT_PROTOCOL;
  workspaceId: string;
  provider: string;
  eventId: string;
  conversationId: string;
  preferredContact: ResponsePreparationPacket["preferredContact"];
  deliveryEligibility: "REVIEW_REQUIRED" | "HUMAN_REVIEW_REQUIRED" | "NO_CHANNEL";
  text: string;
  unresolvedEvidence: string[];
  requiresHumanReview: true;
  outboundExecution: "NOT_PERFORMED";
  deliveryState: "NOT_SENT";
  customerReachedState: "NOT_CLAIMED";
  authorityEffect: "DRAFT_ONLY";
};

function customerOpening(packet: ResponsePreparationPacket) {
  return packet.customerStated.name ? `Hi ${packet.customerStated.name},` : "Hi there,";
}

function questionBlock(packet: ResponsePreparationPacket) {
  if (!packet.customerStated.questions.length) {
    return packet.customerStated.summary
      ? `I’m following up on your request: ${packet.customerStated.summary}`
      : "I’m following up on your vehicle inquiry.";
  }
  const questions = packet.customerStated.questions.map((question) => `• ${question}`).join("\n");
  return `I saw the questions you asked, and I want to make sure I answer each one:\n${questions}`;
}

function evidenceBlock(packet: ResponsePreparationPacket) {
  return packet.safeDraftFrame.evidencePlaceholders.length
    ? `\n\nBefore I give you anything that can change, I’m verifying the current details:\n${packet.safeDraftFrame.evidencePlaceholders.join("\n")}`
    : "";
}

export function createResponseDraft(packet: ResponsePreparationPacket): ResponseDraft {
  const deliveryEligibility = packet.preferredContact === null
    ? "NO_CHANNEL"
    : packet.communicationConsent === true
      ? "REVIEW_REQUIRED"
      : "HUMAN_REVIEW_REQUIRED";

  const closing = "Once those details are confirmed, I can answer the remaining questions and keep this moving for you. — Norris";

  return {
    protocol: RESPONSE_DRAFT_PROTOCOL,
    workspaceId: packet.workspaceId,
    provider: packet.provider,
    eventId: packet.eventId,
    conversationId: packet.conversationId,
    preferredContact: packet.preferredContact,
    deliveryEligibility,
    text: `${customerOpening(packet)}\n\n${questionBlock(packet)}${evidenceBlock(packet)}\n\n${closing}`,
    unresolvedEvidence: [...packet.safeDraftFrame.evidencePlaceholders],
    requiresHumanReview: true,
    outboundExecution: "NOT_PERFORMED",
    deliveryState: "NOT_SENT",
    customerReachedState: "NOT_CLAIMED",
    authorityEffect: "DRAFT_ONLY",
  };
}
