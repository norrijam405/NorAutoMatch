import type { Pool } from "pg";
import {
  conversationEventSchema,
  evaluateConversationRouting,
  type ConversationEvent,
} from "./conversation-gateway";
import { createConversationResponseObligation } from "./conversation-response-sla";

export type ConversationResponseQueueItem = {
  workspaceId: string;
  provider: string;
  eventId: string;
  conversationId: string;
  eventType: ConversationEvent["eventType"];
  observedAt: string;
  receivedAt: string;
  processingState: "RECEIVED";
  routingDecision: "CONTACTABLE" | "HUMAN_REVIEW_REQUIRED";
  routingReasons: string[];
  responseState: "RESPONSE_DUE" | "HUMAN_REVIEW_DUE";
  warningAt: string;
  targetAt: string;
  slaState: "WITHIN_TARGET" | "WARNING" | "OVERDUE";
  customer: ConversationEvent["customer"];
  intent: ConversationEvent["intent"];
  summary: string | null;
  evidence: ConversationEvent["evidence"];
  authorityEffect: "NONE";
};

type QueueRow = {
  workspace_id: string;
  provider: string;
  event_id: string;
  conversation_id: string;
  observed_at: Date | string;
  received_at: Date | string;
  routing_decision: "CONTACTABLE" | "HUMAN_REVIEW_REQUIRED";
  routing_reasons: unknown;
  processing_state: "RECEIVED";
  normalized_payload: unknown;
};

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("CONVERSATION_QUEUE_INVALID_TIMESTAMP");
  return date.toISOString();
}

function deriveSlaState(input: { nowMs: number; warningAt: string; targetAt: string }): ConversationResponseQueueItem["slaState"] {
  const warningMs = Date.parse(input.warningAt);
  const targetMs = Date.parse(input.targetAt);
  if (!Number.isFinite(warningMs) || !Number.isFinite(targetMs)) throw new Error("CONVERSATION_QUEUE_INVALID_SLA_TIMESTAMP");
  if (input.nowMs >= targetMs) return "OVERDUE";
  if (input.nowMs >= warningMs) return "WARNING";
  return "WITHIN_TARGET";
}

function parseReasons(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("CONVERSATION_QUEUE_ROUTING_REASON_DRIFT");
  }
  return value;
}

export async function readConversationResponseQueue(input: {
  pool: Pool;
  workspaceId: string;
  limit?: number;
  now?: Date;
}): Promise<ConversationResponseQueueItem[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error("CONVERSATION_QUEUE_INVALID_NOW");

  const result = await input.pool.query<QueueRow>(
    `SELECT DISTINCT ON (workspace_id, provider, conversation_id)
       workspace_id,
       provider,
       event_id,
       conversation_id,
       observed_at,
       received_at,
       routing_decision,
       routing_reasons,
       processing_state,
       normalized_payload
     FROM crm_conversation_events
     WHERE workspace_id = $1
       AND processing_state = 'RECEIVED'
       AND routing_decision IN ('CONTACTABLE', 'HUMAN_REVIEW_REQUIRED')
     ORDER BY workspace_id, provider, conversation_id, observed_at DESC
     LIMIT $2`,
    [input.workspaceId, limit],
  );

  const items = result.rows.map((row) => {
    const event = conversationEventSchema.parse(row.normalized_payload);
    if (
      event.workspaceId !== row.workspace_id ||
      event.provider !== row.provider ||
      event.eventId !== row.event_id ||
      event.conversationId !== row.conversation_id
    ) {
      throw new Error("CONVERSATION_QUEUE_PROVENANCE_DRIFT");
    }

    const routing = evaluateConversationRouting(event);
    if (routing.decision !== row.routing_decision || routing.decision === "NOT_CONTACTABLE") {
      throw new Error("CONVERSATION_QUEUE_ROUTING_DRIFT");
    }

    const persistedReasons = parseReasons(row.routing_reasons);
    if (JSON.stringify(persistedReasons) !== JSON.stringify(routing.reasons)) {
      throw new Error("CONVERSATION_QUEUE_ROUTING_REASON_DRIFT");
    }

    const obligation = createConversationResponseObligation({ event, routing });
    if (!obligation.warningAt || !obligation.targetAt || obligation.state === "NO_RESPONSE_ROUTE") {
      throw new Error("CONVERSATION_QUEUE_OBLIGATION_DRIFT");
    }

    return {
      workspaceId: row.workspace_id,
      provider: row.provider,
      eventId: row.event_id,
      conversationId: row.conversation_id,
      eventType: event.eventType,
      observedAt: toIso(row.observed_at),
      receivedAt: toIso(row.received_at),
      processingState: "RECEIVED" as const,
      routingDecision: routing.decision,
      routingReasons: routing.reasons,
      responseState: obligation.state,
      warningAt: obligation.warningAt,
      targetAt: obligation.targetAt,
      slaState: deriveSlaState({ nowMs, warningAt: obligation.warningAt, targetAt: obligation.targetAt }),
      customer: event.customer,
      intent: event.intent,
      summary: event.summary,
      evidence: event.evidence,
      authorityEffect: "NONE" as const,
    };
  });

  return items.sort((left, right) => {
    const priority = { OVERDUE: 0, WARNING: 1, WITHIN_TARGET: 2 } as const;
    const bySla = priority[left.slaState] - priority[right.slaState];
    if (bySla !== 0) return bySla;
    return Date.parse(left.targetAt) - Date.parse(right.targetAt);
  });
}
