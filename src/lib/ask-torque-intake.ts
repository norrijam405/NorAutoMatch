import { createHash } from "node:crypto";
import { z } from "zod";
import type { ConversationEvent } from "./conversation-gateway";

const nullableContact = z.string().trim().max(254).optional().nullable();

export const askTorqueInputSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  vehicleVin: z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/).optional().nullable(),
  customer: z.object({
    name: z.string().trim().min(1).max(160).optional().nullable(),
    phone: z.string().trim().min(7).max(32).optional().nullable(),
    email: z.string().trim().email().max(254).optional().nullable(),
    preferredContact: z.enum(["PHONE", "TEXT", "EMAIL"]).optional().nullable(),
    communicationConsent: z.boolean().optional().nullable(),
  }),
});

export type AskTorqueInput = z.infer<typeof askTorqueInputSchema>;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
    .join(",")}}`;
}

export function buildAskTorqueConversationEvent(input: AskTorqueInput, observedAt: string): ConversationEvent {
  const parsed = askTorqueInputSchema.parse(input);

  if (parsed.customer.preferredContact === "EMAIL" && !parsed.customer.email) {
    throw new Error("EMAIL_CONTACT_REQUIRES_EMAIL");
  }
  if ((parsed.customer.preferredContact === "PHONE" || parsed.customer.preferredContact === "TEXT") && !parsed.customer.phone) {
    throw new Error("PHONE_OR_TEXT_CONTACT_REQUIRES_PHONE");
  }
  if (parsed.customer.communicationConsent === true && !parsed.customer.preferredContact) {
    throw new Error("CONSENT_REQUIRES_PREFERRED_CONTACT");
  }

  const sourcePayload = {
    conversationId: parsed.conversationId,
    messageId: parsed.messageId,
    message: parsed.message,
    vehicleVin: parsed.vehicleVin ?? null,
    customer: parsed.customer,
  };
  const sourceHash = createHash("sha256").update(canonicalize(sourcePayload)).digest("hex");

  return {
    protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
    workspaceId: "norautomatch",
    provider: "NORAUTO_SITE_CHAT",
    conversationId: `site-${parsed.conversationId}`,
    eventId: `site-${parsed.messageId}`,
    eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
    observedAt,
    customer: {
      name: parsed.customer.name ?? null,
      phone: parsed.customer.phone ?? null,
      email: parsed.customer.email ?? null,
      preferredContact: parsed.customer.preferredContact ?? null,
      communicationConsent: parsed.customer.communicationConsent ?? null,
    },
    intent: {
      category: parsed.vehicleVin ? "VEHICLE_DETAILS" : "SHOPPING_ASSISTANCE",
      subjectRefs: parsed.vehicleVin ? [parsed.vehicleVin] : [],
      questions: [parsed.message],
      constraints: [],
      urgency: "NORMAL",
    },
    summary: parsed.message,
    evidence: {
      transcriptAvailable: true,
      sourceRef: "norautomatch://site-chat/customer-message",
      sourceHash,
    },
    authorityEffect: "NONE",
  };
}
