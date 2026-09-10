import {
  evaluateConversationRouting,
  type ConversationEvent,
  type ConversationRoutingDecision,
} from "./conversation-gateway";
import { createConversationResponseObligation } from "./conversation-response-sla";

export const RESPONSE_PREPARATION_PROTOCOL = "NORAUTO_RESPONSE_PREPARATION_PACKET_V1" as const;

export type ResponseEvidenceRequirement = {
  topic: "AVAILABILITY" | "PRICE" | "INCENTIVES" | "FINANCING" | "RESERVATION" | "APPOINTMENT";
  state: "REQUIRES_CURRENT_EVIDENCE";
  reason: string;
};

export type ResponsePreparationPacket = {
  protocol: typeof RESPONSE_PREPARATION_PROTOCOL;
  workspaceId: string;
  provider: string;
  eventId: string;
  conversationId: string;
  routingDecision: ConversationRoutingDecision["decision"];
  responseState: "RESPONSE_DUE" | "HUMAN_REVIEW_DUE" | "NO_RESPONSE_ROUTE";
  preferredContact: ConversationEvent["customer"]["preferredContact"];
  communicationConsent: boolean | null;
  customerStated: {
    name: string | null;
    subjectRefs: string[];
    questions: string[];
    constraints: string[];
    urgency: ConversationEvent["intent"]["urgency"];
    summary: string | null;
  };
  safeDraftFrame: {
    opening: string;
    acknowledgement: string;
    evidencePlaceholders: string[];
    closing: string;
  };
  evidenceRequirements: ResponseEvidenceRequirement[];
  outboundExecution: "NOT_PERFORMED";
  deliveryState: "NOT_CLAIMED";
  customerReachedState: "NOT_CLAIMED";
  authorityEffect: "DRAFT_PREPARATION_ONLY";
};

const evidenceRequirements: ResponseEvidenceRequirement[] = [
  {
    topic: "AVAILABILITY",
    state: "REQUIRES_CURRENT_EVIDENCE",
    reason: "Vehicle availability can change and must be supported by current authorized inventory/dealership evidence.",
  },
  {
    topic: "PRICE",
    state: "REQUIRES_CURRENT_EVIDENCE",
    reason: "Current selling price and fees must come from authorized current pricing evidence.",
  },
  {
    topic: "INCENTIVES",
    state: "REQUIRES_CURRENT_EVIDENCE",
    reason: "Incentives may vary by eligibility and effective date and require current program evidence.",
  },
  {
    topic: "FINANCING",
    state: "REQUIRES_CURRENT_EVIDENCE",
    reason: "Financing terms and approval cannot be inferred from a conversation or draft response.",
  },
  {
    topic: "RESERVATION",
    state: "REQUIRES_CURRENT_EVIDENCE",
    reason: "A vehicle is not reserved merely because a customer expressed interest or received a response.",
  },
  {
    topic: "APPOINTMENT",
    state: "REQUIRES_CURRENT_EVIDENCE",
    reason: "An appointment requires explicit appointment-confirmation evidence before CRM progression.",
  },
];

function acknowledgement(event: ConversationEvent): string {
  if (event.intent.questions.length > 0) {
    return "Acknowledge the customer's listed questions individually before adding new sales information.";
  }
  if (event.summary) return "Continue from the supplied conversation summary instead of restarting the relationship.";
  return "Acknowledge the customer's inquiry without inventing details that were not supplied.";
}

export function createResponsePreparationPacket(input: {
  event: ConversationEvent;
  routing?: ConversationRoutingDecision;
}): ResponsePreparationPacket {
  const routing = input.routing ?? evaluateConversationRouting(input.event);
  const obligation = createConversationResponseObligation({ event: input.event, routing });

  return {
    protocol: RESPONSE_PREPARATION_PROTOCOL,
    workspaceId: input.event.workspaceId,
    provider: input.event.provider,
    eventId: input.event.eventId,
    conversationId: input.event.conversationId,
    routingDecision: routing.decision,
    responseState: obligation.state,
    preferredContact: input.event.customer.preferredContact,
    communicationConsent: input.event.customer.communicationConsent,
    customerStated: {
      name: input.event.customer.name,
      subjectRefs: [...input.event.intent.subjectRefs],
      questions: [...input.event.intent.questions],
      constraints: [...input.event.intent.constraints],
      urgency: input.event.intent.urgency,
      summary: input.event.summary,
    },
    safeDraftFrame: {
      opening: input.event.customer.name
        ? `Continue naturally with ${input.event.customer.name}; do not imply prior personal contact unless the evidence says so.`
        : "Continue naturally without inventing a customer name.",
      acknowledgement: acknowledgement(input.event),
      evidencePlaceholders: evidenceRequirements.map((item) => `[VERIFY_${item.topic}]`),
      closing: "Invite the customer to continue the conversation. Do not claim an appointment, reservation, approval, delivery, or sale unless separately evidenced.",
    },
    evidenceRequirements: evidenceRequirements.map((item) => ({ ...item })),
    outboundExecution: "NOT_PERFORMED",
    deliveryState: "NOT_CLAIMED",
    customerReachedState: "NOT_CLAIMED",
    authorityEffect: "DRAFT_PREPARATION_ONLY",
  };
}
