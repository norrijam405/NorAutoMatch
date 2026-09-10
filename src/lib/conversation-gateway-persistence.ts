import type { Pool } from "pg";
import { conversationEventSchema, evaluateConversationRouting, type ConversationEvent } from "./conversation-gateway";

export type PersistConversationEventResult = {
  status: "COMMITTED" | "DEDUPLICATED";
  workspaceId: string;
  provider: string;
  eventId: string;
  conversationId: string;
  routingDecision: "CONTACTABLE" | "HUMAN_REVIEW_REQUIRED" | "NOT_CONTACTABLE";
  processingState: "RECEIVED";
  authorityEffect: "NONE";
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`);
  return `{${entries.join(",")}}`;
}

export async function persistConversationEvent(input: {
  pool: Pool;
  event: ConversationEvent;
}): Promise<PersistConversationEventResult> {
  const event = conversationEventSchema.parse(input.event);
  const routing = evaluateConversationRouting(event);
  const client = await input.pool.connect();
  const canonicalPayload = canonicalize(event);

  try {
    await client.query("BEGIN");
    const existing = await client.query<{
      conversation_id: string;
      normalized_payload: ConversationEvent;
      routing_decision: PersistConversationEventResult["routingDecision"];
      processing_state: string;
    }>(
      `SELECT conversation_id, normalized_payload, routing_decision, processing_state
         FROM crm_conversation_events
        WHERE workspace_id=$1 AND provider=$2 AND event_id=$3
        FOR UPDATE`,
      [event.workspaceId, event.provider, event.eventId],
    );

    if (existing.rowCount === 1) {
      const row = existing.rows[0];
      if (!row || canonicalize(row.normalized_payload) !== canonicalPayload) {
        throw new Error("CONVERSATION_EVENT_IDENTITY_COLLISION");
      }
      await client.query("COMMIT");
      return {
        status: "DEDUPLICATED",
        workspaceId: event.workspaceId,
        provider: event.provider,
        eventId: event.eventId,
        conversationId: row.conversation_id,
        routingDecision: row.routing_decision,
        processingState: "RECEIVED",
        authorityEffect: "NONE",
      };
    }

    await client.query(
      `INSERT INTO crm_conversation_events (
         workspace_id, provider, event_id, conversation_id, event_type, observed_at,
         source_ref, source_hash, normalized_payload, routing_decision, routing_reasons,
         processing_state
       ) VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7,$8,$9::jsonb,$10,$11::jsonb,'RECEIVED')`,
      [
        event.workspaceId,
        event.provider,
        event.eventId,
        event.conversationId,
        event.eventType,
        event.observedAt,
        event.evidence.sourceRef,
        event.evidence.sourceHash?.toLowerCase() ?? null,
        JSON.stringify(event),
        routing.decision,
        JSON.stringify(routing.reasons),
      ],
    );
    await client.query("COMMIT");

    return {
      status: "COMMITTED",
      workspaceId: event.workspaceId,
      provider: event.provider,
      eventId: event.eventId,
      conversationId: event.conversationId,
      routingDecision: routing.decision,
      processingState: "RECEIVED",
      authorityEffect: "NONE",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Conversation-event transaction and rollback failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
