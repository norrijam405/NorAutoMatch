import { Pool, type PoolClient } from "pg";
import type {
  CrmPersistenceAdapter,
  CrmPersistenceTransaction,
  PersistedEvidenceRow,
  PersistedManagerReceiptRow,
  PersistedOpportunityRow,
  PersistedOutboxRow,
} from "./crm-persistence";

function opportunityValues(row: PersistedOpportunityRow) {
  return [
    row.opportunityId,
    row.workspaceId,
    row.intakeIdempotencyKey,
    row.pipeline,
    row.stage,
    row.deskState,
    row.customer,
    row.buyingIntent,
    row.inventoryEvidence,
    row.attribution,
    row.latestHandoffId,
    row.latestManagerReceiptId ?? null,
    row.outcomeType ?? null,
    row.outcomeEvidenceRef ?? null,
    row.createdAt,
    row.updatedAt,
  ];
}

class PostgresCrmTransaction implements CrmPersistenceTransaction {
  constructor(private readonly client: PoolClient) {}

  async insertOpportunity(row: PersistedOpportunityRow) {
    const result = await this.client.query<{ opportunity_id: string }>(
      `INSERT INTO crm_opportunities (
        opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
        customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
        latest_manager_receipt_id, outcome_type, outcome_evidence_ref, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11,
        $12, $13, $14, $15::timestamptz, $16::timestamptz
      )
      ON CONFLICT (intake_idempotency_key) DO NOTHING
      RETURNING opportunity_id`,
      opportunityValues(row),
    );

    if (result.rowCount === 1) return "INSERTED" as const;

    const existing = await this.client.query<{
      opportunity_id: string;
      workspace_id: string;
      pipeline: string;
    }>(
      `SELECT opportunity_id, workspace_id, pipeline
       FROM crm_opportunities
       WHERE intake_idempotency_key = $1`,
      [row.intakeIdempotencyKey],
    );

    const current = existing.rows[0];
    if (!current) {
      throw new Error("CRM idempotency conflict occurred but no existing opportunity could be verified.");
    }
    if (
      current.opportunity_id !== row.opportunityId ||
      current.workspace_id !== row.workspaceId ||
      current.pipeline !== row.pipeline
    ) {
      throw new Error("CRM idempotency key collision does not match the expected opportunity identity.");
    }

    return "ALREADY_EXISTS_SAME_IDEMPOTENCY_KEY" as const;
  }

  async insertEvidence(rows: PersistedEvidenceRow[]) {
    for (const row of rows) {
      await this.client.query(
        `INSERT INTO crm_evidence (
          workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at, payload
        ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)`,
        [
          row.workspaceId,
          row.opportunityId,
          row.kind,
          row.ref,
          row.authority,
          row.observedAt,
          {},
        ],
      );
    }
  }

  async insertManagerReceipts(rows: PersistedManagerReceiptRow[]) {
    for (const row of rows) {
      await this.client.query(
        `INSERT INTO crm_manager_review_receipts (
          receipt_id, workspace_id, opportunity_id, handoff_id, receipt_idempotency_key,
          decision, actor_subject_id, actor_verifier, actor_evidence_ref, truth_state, recorded_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11::timestamptz
        )`,
        [
          row.receipt.receiptId,
          row.workspaceId,
          row.opportunityId,
          row.receipt.handoffId,
          row.receipt.idempotencyKey,
          row.receipt.decision,
          row.receipt.actor.subjectId,
          row.receipt.actor.verifier,
          row.receipt.actor.evidenceRef ?? null,
          row.receipt.truthState,
          row.receipt.recordedAt,
        ],
      );
    }
  }

  async insertOutbox(rows: PersistedOutboxRow[]) {
    for (const row of rows) {
      const event = row.event;
      await this.client.query(
        `INSERT INTO crm_outbox (
          event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
          pipeline, payload, occurred_at, delivery_state, attempts, max_attempts
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7::jsonb, $8::timestamptz, $9, $10, $11
        )`,
        [
          event.eventId,
          row.workspaceId,
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
    }
  }
}

export class PostgresCrmPersistenceAdapter implements CrmPersistenceAdapter {
  constructor(private readonly pool: Pool) {}

  async runAtomic<T>(operation: (transaction: CrmPersistenceTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(new PostgresCrmTransaction(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "CRM transaction failed and rollback also failed.");
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export function createPostgresCrmPool(connectionString: string) {
  if (!connectionString.trim()) throw new Error("Postgres CRM connection string is required.");
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}
