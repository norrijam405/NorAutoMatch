import { z } from "zod";

const nullableBounded = (max: number) => z.string().trim().max(max).nullable();

export const conversationEventSchema = z.object({
  protocol: z.literal("IGNIAQUA_CONVERSATION_EVENT_V1"),
  workspaceId: z.string().trim().min(1).max(128),
  provider: z.string().trim().min(1).max(100),
  conversationId: z.string().trim().min(1).max(256),
  eventId: z.string().trim().min(1).max(256),
  eventType: z.enum(["CONVERSATION_ENDED_OR_HANDOFF_READY", "CONTACT_INFORMATION_SUBMITTED", "LEAD_DELIVERED_TO_CRM"]),
  observedAt: z.string().datetime({ offset: true }),
  customer: z.object({
    name: nullableBounded(160),
    phone: nullableBounded(32),
    email: nullableBounded(254),
    preferredContact: z.enum(["PHONE", "TEXT", "EMAIL"]).nullable(),
    communicationConsent: z.boolean().nullable(),
  }),
  intent: z.object({
    category: nullableBounded(100),
    subjectRefs: z.array(z.string().trim().min(1).max(256)).max(50),
    questions: z.array(z.string().trim().min(1).max(500)).max(50),
    constraints: z.array(z.string().trim().min(1).max(500)).max(50),
    urgency: z.enum(["LOW", "NORMAL", "HIGH"]).nullable(),
  }),
  summary: nullableBounded(4000),
  evidence: z.object({
    transcriptAvailable: z.boolean(),
    sourceRef: nullableBounded(512),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/i).nullable(),
  }),
  authorityEffect: z.literal("NONE"),
});

export type ConversationEvent = z.infer<typeof conversationEventSchema>;

export type ConversationRoutingDecision = {
  protocol: "IGNIAQUA_CONVERSATION_ROUTING_DECISION_V1";
  decision: "CONTACTABLE" | "HUMAN_REVIEW_REQUIRED" | "NOT_CONTACTABLE";
  reasons: string[];
  authorityEffect: "NONE";
};

export function evaluateConversationRouting(event: ConversationEvent): ConversationRoutingDecision {
  const reasons: string[] = [];
  const hasContact = Boolean(event.customer.phone || event.customer.email);

  if (!hasContact) reasons.push("NO_CONTACT_ROUTE");
  if (event.customer.communicationConsent !== true) reasons.push("COMMUNICATION_CONSENT_NOT_PROVEN");
  if (!event.intent.questions.length && !event.summary) reasons.push("NO_ACTIONABLE_CONTEXT");

  if (!hasContact) {
    return {
      protocol: "IGNIAQUA_CONVERSATION_ROUTING_DECISION_V1",
      decision: "NOT_CONTACTABLE",
      reasons,
      authorityEffect: "NONE",
    };
  }

  if (reasons.length) {
    return {
      protocol: "IGNIAQUA_CONVERSATION_ROUTING_DECISION_V1",
      decision: "HUMAN_REVIEW_REQUIRED",
      reasons,
      authorityEffect: "NONE",
    };
  }

  return {
    protocol: "IGNIAQUA_CONVERSATION_ROUTING_DECISION_V1",
    decision: "CONTACTABLE",
    reasons: ["CONTACT_ROUTE_AND_CONSENT_PRESENT"],
    authorityEffect: "NONE",
  };
}
