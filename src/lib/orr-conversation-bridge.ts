import { z } from "zod";
import type { ConversationEvent } from "./conversation-gateway";

export const ORR_DEALER_ID = 2175;
export const ORR_DEALER_DOMAIN = "orrnissanwest.com";

const orrConversationInputSchema = z.object({
  dealerId: z.literal(ORR_DEALER_ID),
  dealerDomain: z.literal(ORR_DEALER_DOMAIN),
  provider: z.enum(["RIDEMOTIVE_CHAT", "RIDEMOTIVE_LEAD"]),
  externalConversationId: z.string().trim().min(1).max(256),
  externalEventId: z.string().trim().min(1).max(256),
  observedAt: z.string().datetime({ offset: true }),
  message: z.string().trim().min(1).max(4000),
  vehicleId: z.string().trim().min(1).max(256).nullable().optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(160).nullable(),
    phone: z.string().trim().min(1).max(32).nullable(),
    email: z.string().trim().email().max(254).nullable(),
    preferredContact: z.enum(["PHONE", "TEXT", "EMAIL"]).nullable(),
    communicationConsent: z.boolean().nullable(),
  }),
  sourceRef: z.string().trim().min(1).max(512),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/i),
});

export type OrrConversationInput = z.infer<typeof orrConversationInputSchema>;

export function normalizeAuthorizedOrrConversation(input: OrrConversationInput): ConversationEvent {
  const parsed = orrConversationInputSchema.parse(input);
  return {
    protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
    workspaceId: "norautomatch",
    provider: parsed.provider,
    conversationId: parsed.externalConversationId,
    eventId: parsed.externalEventId,
    eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
    observedAt: parsed.observedAt,
    customer: {
      name: parsed.customer.name,
      phone: parsed.customer.phone,
      email: parsed.customer.email,
      preferredContact: parsed.customer.preferredContact,
      communicationConsent: parsed.customer.communicationConsent,
    },
    intent: {
      category: parsed.vehicleId ? "VEHICLE_DETAILS" : "SHOPPING_ASSISTANCE",
      subjectRefs: parsed.vehicleId ? [parsed.vehicleId] : [],
      questions: [parsed.message],
      constraints: [],
      urgency: "NORMAL",
    },
    summary: parsed.message,
    evidence: {
      transcriptAvailable: true,
      sourceRef: parsed.sourceRef,
      sourceHash: parsed.sourceHash,
    },
    authorityEffect: "NONE",
  };
}
