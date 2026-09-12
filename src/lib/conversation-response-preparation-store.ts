import type { Pool } from "pg";
import { conversationEventSchema, evaluateConversationRouting } from "./conversation-gateway";
import { createResponsePreparationPacket, type ResponsePreparationPacket } from "./conversation-response-preparation";

type PreparationRow = {
  workspace_id: string;
  provider: string;
  event_id: string;
  conversation_id: string;
  normalized_payload: unknown;
  routing_decision: "CONTACTABLE" | "HUMAN_REVIEW_REQUIRED" | "NOT_CONTACTABLE";
  routing_reasons: unknown;
  processing_state: "RECEIVED" | "ROUTED" | "DEAD_LETTER" | "REDACTED";
};

function parseReasons(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("RESPONSE_PREPARATION_ROUTING_REASON_DRIFT");
  }
  return value;
}

export async function readResponsePreparationPacket(input: {
  pool: Pool;
  workspaceId: string;
  provider: string;
  eventId: string;
}): Promise<ResponsePreparationPacket | null> {
  const result = await input.pool.query<PreparationRow>(
    `SELECT workspace_id, provider, event_id, conversation_id, normalized_payload,
            routing_decision, routing_reasons, processing_state
       FROM crm_conversation_events
      WHERE workspace_id = $1 AND provider = $2 AND event_id = $3
      LIMIT 1`,
    [input.workspaceId, input.provider, input.eventId],
  );

  const row = result.rows[0];
  if (!row) return null;
  if (row.processing_state === "DEAD_LETTER" || row.processing_state === "REDACTED") return null;

  const event = conversationEventSchema.parse(row.normalized_payload);
  if (
    event.workspaceId !== row.workspace_id ||
    event.provider !== row.provider ||
    event.eventId !== row.event_id ||
    event.conversationId !== row.conversation_id
  ) {
    throw new Error("RESPONSE_PREPARATION_PROVENANCE_DRIFT");
  }

  const routing = evaluateConversationRouting(event);
  if (routing.decision !== row.routing_decision) {
    throw new Error("RESPONSE_PREPARATION_ROUTING_DRIFT");
  }

  const persistedReasons = parseReasons(row.routing_reasons);
  if (JSON.stringify(persistedReasons) !== JSON.stringify(routing.reasons)) {
    throw new Error("RESPONSE_PREPARATION_ROUTING_REASON_DRIFT");
  }

  return createResponsePreparationPacket({ event, routing });
}
