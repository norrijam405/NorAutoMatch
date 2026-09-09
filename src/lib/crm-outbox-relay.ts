import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { CrmOpportunity } from "./crm-core";
import type { ManagerHandoffEnvelope } from "./manager-handoff";

export type ClaimedCrmOutboxEvent = {
  eventId: string;
  workspaceId: string;
  aggregateId: string;
  idempotencyKey: string;
  eventType: string;
  pipeline: CrmOpportunity["pipeline"];
  payload: Record<string, unknown>;
  occurredAt: string;
  attempts: number;
  maxAttempts: number;
  claimToken: string;
  claimExpiresAt: string;
};

export type CrmRelayDeliveryPayload = {
  protocol: "NORAUTO_CRM_OUTBOX_DELIVERY_V1";
  event: {
    eventId: string;
    eventType: string;
    idempotencyKey: string;
    occurredAt: string;
    attempt: number;
  };
  opportunity: {
    opportunityId: string;
    pipeline: CrmOpportunity["pipeline"];
    stage: string;
    deskState: string;
    customer: unknown;
    buyingIntent: unknown;
    inventoryEvidence: unknown;
    attribution: unknown;
  };
  managerHandoff: ManagerHandoffEnvelope;
};

export type CrmRelayOutcome =
  | { eventId: string; status: "DELIVERED"; attempt: number }
  | { eventId: string; status: "RETRY_SCHEDULED"; attempt: number; nextAttemptAt: string }
  | { eventId: string; status: "PARKED"; attempt: number };

function safeError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return text.slice(0, 1000);
}

function retryDelayMs(attempt: number) {
  const base = 5_000;
  const cappedExponent = Math.min(Math.max(attempt - 1, 0), 8);
  return Math.min(base * 2 ** cappedExponent, 15 * 60_000);
}

function requireDeliveryUrl(rawUrl: string, allowInsecureLocalhost: boolean) {
  const url = new URL(rawUrl);
  if (url.protocol === "https:") return url;
  const local = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (allowInsecureLocalhost && local) return url;
  throw new Error("CRM relay target must use HTTPS; HTTP is allowed only for explicit localhost testing.");
}

async function recoverExpiredClaims(client: PoolClient) {
  await client.query(
    `UPDATE crm_outbox
     SET delivery_state = 'FAILED',
         claim_token = NULL,
         claimed_at = NULL,
         claim_expires_at = NULL,
         next_attempt_at = CURRENT_TIMESTAMP,
         last_error = COALESCE(last_error, 'worker claim expired before completion')
     WHERE delivery_state = 'PROCESSING'
       AND claim_expires_at <= CURRENT_TIMESTAMP`,
  );
}

export async function claimCrmOutboxBatch(input: {
  pool: Pool;
  limit?: number;
  leaseSeconds?: number;
}): Promise<ClaimedCrmOutboxEvent[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 100));
  const leaseSeconds = Math.max(5, Math.min(input.leaseSeconds ?? 60, 600));
  const client = await input.pool.connect();
  const claimBatchToken = randomUUID();

  try {
    await client.query("BEGIN");
    await recoverExpiredClaims(client);
    const result = await client.query<{
      event_id: string;
      workspace_id: string;
      aggregate_id: string;
      event_idempotency_key: string;
      event_type: string;
      pipeline: CrmOpportunity["pipeline"];
      payload: Record<string, unknown>;
      occurred_at: Date;
      attempts: number;
      max_attempts: number;
      claim_token: string;
      claim_expires_at: Date;
    }>(
      `WITH candidates AS (
         SELECT event_id
         FROM crm_outbox
         WHERE delivery_state IN ('PENDING', 'FAILED')
           AND attempts < max_attempts
           AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
         ORDER BY created_at, event_id
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE crm_outbox AS o
       SET delivery_state = 'PROCESSING',
           attempts = o.attempts + 1,
           claim_token = gen_random_uuid(),
           claimed_at = CURRENT_TIMESTAMP,
           claim_expires_at = CURRENT_TIMESTAMP + make_interval(secs => $2),
           next_attempt_at = NULL,
           last_error = NULL
       FROM candidates
       WHERE o.event_id = candidates.event_id
       RETURNING o.event_id, o.workspace_id, o.aggregate_id, o.event_idempotency_key,
                 o.event_type, o.pipeline, o.payload, o.occurred_at, o.attempts,
                 o.max_attempts, o.claim_token::text, o.claim_expires_at`,
      [limit, leaseSeconds],
    );
    await client.query("COMMIT");

    return result.rows.map((row) => ({
      eventId: row.event_id,
      workspaceId: row.workspace_id,
      aggregateId: row.aggregate_id,
      idempotencyKey: row.event_idempotency_key,
      eventType: row.event_type,
      pipeline: row.pipeline,
      payload: row.payload,
      occurredAt: row.occurred_at.toISOString(),
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      claimToken: row.claim_token,
      claimExpiresAt: row.claim_expires_at.toISOString(),
    }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    void claimBatchToken;
  }
}

async function loadDeliveryPayload(pool: Pool, event: ClaimedCrmOutboxEvent): Promise<CrmRelayDeliveryPayload> {
  const result = await pool.query<{
    opportunity_id: string;
    pipeline: CrmOpportunity["pipeline"];
    stage: string;
    desk_state: string;
    customer: unknown;
    buying_intent: unknown;
    inventory_evidence: unknown;
    attribution: unknown;
    handoff: ManagerHandoffEnvelope;
  }>(
    `SELECT o.opportunity_id, o.pipeline, o.stage, o.desk_state, o.customer,
            o.buying_intent, o.inventory_evidence, o.attribution,
            jsonb_build_object(
              'protocol', h.protocol,
              'handoffId', h.handoff_id,
              'idempotencyKey', h.handoff_idempotency_key,
              'createdAt', h.created_at,
              'workflowState', h.workflow_state,
              'deskPrep', h.desk_prep,
              'authority', h.authority
            ) AS handoff
     FROM crm_opportunities o
     JOIN crm_manager_handoffs h
       ON h.workspace_id = o.workspace_id
      AND h.opportunity_id = o.opportunity_id
      AND h.handoff_id = o.latest_handoff_id
     WHERE o.workspace_id = $1 AND o.opportunity_id = $2`,
    [event.workspaceId, event.aggregateId],
  );

  const row = result.rows[0];
  if (!row) throw new Error("CRM relay cannot reconstruct durable opportunity + manager handoff payload.");
  if (row.pipeline !== event.pipeline) throw new Error("CRM relay event pipeline does not match durable opportunity pipeline.");
  if (row.handoff.authority.approveDeal !== "NOT_AUTHORIZED") {
    throw new Error("CRM relay refused handoff carrying deal-approval authority.");
  }

  return {
    protocol: "NORAUTO_CRM_OUTBOX_DELIVERY_V1",
    event: {
      eventId: event.eventId,
      eventType: event.eventType,
      idempotencyKey: event.idempotencyKey,
      occurredAt: event.occurredAt,
      attempt: event.attempts,
    },
    opportunity: {
      opportunityId: row.opportunity_id,
      pipeline: row.pipeline,
      stage: row.stage,
      deskState: row.desk_state,
      customer: row.customer,
      buyingIntent: row.buying_intent,
      inventoryEvidence: row.inventory_evidence,
      attribution: row.attribution,
    },
    managerHandoff: row.handoff,
  };
}

async function markDelivered(pool: Pool, event: ClaimedCrmOutboxEvent) {
  const result = await pool.query(
    `UPDATE crm_outbox
     SET delivery_state = 'DELIVERED', delivered_at = CURRENT_TIMESTAMP,
         claim_token = NULL, claimed_at = NULL, claim_expires_at = NULL,
         next_attempt_at = NULL, last_error = NULL
     WHERE event_id = $1 AND claim_token = $2::uuid AND delivery_state = 'PROCESSING'`,
    [event.eventId, event.claimToken],
  );
  if (result.rowCount !== 1) throw new Error("CRM relay lost its claim before recording delivery.");
}

async function markFailure(pool: Pool, event: ClaimedCrmOutboxEvent, error: unknown): Promise<CrmRelayOutcome> {
  const parked = event.attempts >= event.maxAttempts;
  const nextAttemptAt = parked ? null : new Date(Date.now() + retryDelayMs(event.attempts)).toISOString();
  const result = await pool.query(
    `UPDATE crm_outbox
     SET delivery_state = 'FAILED',
         claim_token = NULL, claimed_at = NULL, claim_expires_at = NULL,
         next_attempt_at = $3::timestamptz,
         last_error = $4
     WHERE event_id = $1 AND claim_token = $2::uuid AND delivery_state = 'PROCESSING'`,
    [event.eventId, event.claimToken, nextAttemptAt, safeError(error)],
  );
  if (result.rowCount !== 1) throw new Error("CRM relay lost its claim before recording failure.");
  return parked
    ? { eventId: event.eventId, status: "PARKED", attempt: event.attempts }
    : { eventId: event.eventId, status: "RETRY_SCHEDULED", attempt: event.attempts, nextAttemptAt: nextAttemptAt! };
}

export async function deliverClaimedCrmOutboxEvent(input: {
  pool: Pool;
  event: ClaimedCrmOutboxEvent;
  targetUrl: string;
  timeoutMs?: number;
  allowInsecureLocalhost?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<CrmRelayOutcome> {
  const url = requireDeliveryUrl(input.targetUrl, input.allowInsecureLocalhost ?? false);
  const timeoutMs = Math.max(250, Math.min(input.timeoutMs ?? 8_000, 30_000));
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const payload = await loadDeliveryPayload(input.pool, input.event);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "NorAutoMatch-Outbox/1.0",
          "Idempotency-Key": input.event.idempotencyKey,
          "X-NorAuto-Event-Id": input.event.eventId,
          "X-NorAuto-Handoff-Id": payload.managerHandoff.handoffId,
          "X-NorAuto-Protocol": payload.protocol,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`CRM relay target returned HTTP ${response.status}.`);
    } finally {
      clearTimeout(timeout);
    }

    await markDelivered(input.pool, input.event);
    return { eventId: input.event.eventId, status: "DELIVERED", attempt: input.event.attempts };
  } catch (error) {
    return markFailure(input.pool, input.event, error);
  }
}

export async function runCrmOutboxRelayOnce(input: {
  pool: Pool;
  targetUrl: string;
  limit?: number;
  leaseSeconds?: number;
  timeoutMs?: number;
  allowInsecureLocalhost?: boolean;
  fetchImpl?: typeof fetch;
}) {
  const events = await claimCrmOutboxBatch({ pool: input.pool, limit: input.limit, leaseSeconds: input.leaseSeconds });
  const outcomes: CrmRelayOutcome[] = [];
  for (const event of events) {
    outcomes.push(await deliverClaimedCrmOutboxEvent({
      pool: input.pool,
      event,
      targetUrl: input.targetUrl,
      timeoutMs: input.timeoutMs,
      allowInsecureLocalhost: input.allowInsecureLocalhost,
      fetchImpl: input.fetchImpl,
    }));
  }
  return outcomes;
}
