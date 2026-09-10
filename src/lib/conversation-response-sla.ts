import type { ConversationEvent, ConversationRoutingDecision } from "./conversation-gateway";

export const FIRST_RESPONSE_WARNING_SECONDS = 120;
export const FIRST_RESPONSE_TARGET_SECONDS = 180;

export type ConversationResponseObligation = {
  protocol: "IGNIAQUA_CONVERSATION_RESPONSE_OBLIGATION_V1";
  workspaceId: string;
  provider: string;
  eventId: string;
  conversationId: string;
  state: "RESPONSE_DUE" | "HUMAN_REVIEW_DUE" | "NO_RESPONSE_ROUTE";
  observedAt: string;
  warningAt: string | null;
  targetAt: string | null;
  authorityEffect: "NONE";
};

export function createConversationResponseObligation(input: {
  event: ConversationEvent;
  routing: ConversationRoutingDecision;
}): ConversationResponseObligation {
  const observedMs = Date.parse(input.event.observedAt);
  if (!Number.isFinite(observedMs)) throw new Error("Conversation response obligation requires a valid observation time.");

  if (input.routing.decision === "NOT_CONTACTABLE") {
    return {
      protocol: "IGNIAQUA_CONVERSATION_RESPONSE_OBLIGATION_V1",
      workspaceId: input.event.workspaceId,
      provider: input.event.provider,
      eventId: input.event.eventId,
      conversationId: input.event.conversationId,
      state: "NO_RESPONSE_ROUTE",
      observedAt: input.event.observedAt,
      warningAt: null,
      targetAt: null,
      authorityEffect: "NONE",
    };
  }

  return {
    protocol: "IGNIAQUA_CONVERSATION_RESPONSE_OBLIGATION_V1",
    workspaceId: input.event.workspaceId,
    provider: input.event.provider,
    eventId: input.event.eventId,
    conversationId: input.event.conversationId,
    state: input.routing.decision === "CONTACTABLE" ? "RESPONSE_DUE" : "HUMAN_REVIEW_DUE",
    observedAt: input.event.observedAt,
    warningAt: new Date(observedMs + FIRST_RESPONSE_WARNING_SECONDS * 1000).toISOString(),
    targetAt: new Date(observedMs + FIRST_RESPONSE_TARGET_SECONDS * 1000).toISOString(),
    authorityEffect: "NONE",
  };
}
