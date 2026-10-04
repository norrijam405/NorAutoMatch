import type { Pool } from "pg";
import type { CrmOpportunity } from "./crm-core";
import { createCrmOutboxEvent } from "./crm-outbox";
import type { CrmFollowUpObligationType } from "./crm-follow-up";

export type FollowUpDueEmission = {
  opportunityId: string;
  obligationType: CrmFollowUpObligationType;
  dueAt: string;
  eventId: string;
  status: "EMITTED" | "DEDUPLICATED";
};

export async function emitDueFollowUpEvents(input: {
  pool: Pool;
  workspaceId: string;
  now?: string;
  limit?: number;
}): Promise<FollowUpDueEmission[]> {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("Follow-up due emission requires an explicit workspace boundary.");
  const now = input.now ? new Date(input.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Follow-up due emission requires a valid observation time.");
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const client = await input.pool.connect();

  try {
    await client.query("BEGIN");
    const due = await client.query<{
      opportunity_id: string;
      pipeline: CrmOpportunity["pipeline"];
      obligation_type: CrmFollowUpObligationType;
      due_at: Date;
    }>(
      `SELECT f.opportunity_id, o.pipeline, f.obligation_type, f.due_at
         FROM crm_follow_up_obligations f
         JOIN crm_opportunities o
           ON o.workspace_id = f.workspace_id
          AND o.opportunity_id = f.opportunity_id
        WHERE f.workspace_id = $1
          AND f.satisfied_at IS NULL
          AND f.due_at <= $2::timestamptz
          AND o.stage IN ('NEW', 'CONTACT_PENDING')
        ORDER BY f.due_at, f.opportunity_id
        FOR UPDATE OF f SKIP LOCKED
        LIMIT $3`,
      [workspaceId, now.toISOString(), limit],
    );

    const emissions: FollowUpDueEmission[] = [];
    for (const row of due.rows) {
      const event = createCrmOutboxEvent({
        opportunity: { opportunityId: row.opportunity_id, pipeline: row.pipeline },
        eventType: "CRM_FOLLOW_UP_DUE",
        occurredAt: row.due_at.toISOString(),
        payload: {
          opportunityId: row.opportunity_id,
          obligationType: row.obligation_type,
          dueAt: row.due_at.toISOString(),
          truthState: "DUE_BY_CLOCK",
          authorityEffect: "NONE",
        },
      });

      const inserted = await client.query(
        `INSERT INTO crm_outbox (
           event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
           pipeline, payload, occurred_at, delivery_state, attempts, max_attempts
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz, $9, $10, $11)
         ON CONFLICT (event_idempotency_key) DO NOTHING`,
        [
          event.eventId,
          workspaceId,
          event.aggregateId,
          event.idempotencyKey,
          event.eventType,
          event.pipeline,
          event.payload,
          event.occurredAt,
          event.delivery.state,
          event.delivery.attempts,
          event.delivery.maxAttempts,
        ],
      );

      emissions.push({
        opportunityId: row.opportunity_id,
        obligationType: row.obligation_type,
        dueAt: row.due_at.toISOString(),
        eventId: event.eventId,
        status: inserted.rowCount === 1 ? "EMITTED" : "DEDUPLICATED",
      });
    }

    await client.query("COMMIT");
    return emissions;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Follow-up due emission failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
