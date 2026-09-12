import type { Pool, PoolClient } from "pg";
import {
  applyLegalHold,
  createRedactionRequest,
  evaluateDataLifecycle,
  markBackupResolved,
  type DataLifecycleRecord,
} from "./data-lifecycle";

type LifecycleDbRow = {
  workspace_id: string;
  opportunity_id: string;
  state: DataLifecycleRecord["state"];
  request_ref: string | null;
  request_authority: string | null;
  requested_at: Date | string | null;
  legal_hold_ref: string | null;
  legal_hold_authority: string | null;
  legal_hold_observed_at: Date | string | null;
  primary_redacted_at: Date | string | null;
  backup_disposition: DataLifecycleRecord["backupDisposition"];
  backup_disposition_ref: string | null;
  external_copies: DataLifecycleRecord["externalCopies"];
};

export type PrimaryRedactionReceipt = {
  protocol: "NORAUTO_PRIMARY_REDACTION_RECEIPT_V1";
  receiptId: string;
  workspaceId: string;
  opportunityId: string;
  conversationTargetsRedacted: number;
  localConversationTruth: "NO_EXPLICIT_TARGETS_DECLARED" | "EXPLICIT_TARGETS_REDACTED_SCOPE_NOT_PROVEN_COMPLETE";
  backupTruth: "PENDING_SEPARATE_DISPOSITION";
  externalCopyTruth: DataLifecycleRecord["externalCopies"];
  authorityEffect: "NONE";
};

function iso(value: Date | string | null | undefined) {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("DATA_LIFECYCLE_DATABASE_TIMESTAMP_INVALID");
  return date.toISOString();
}

function mapLifecycleRow(row: LifecycleDbRow): DataLifecycleRecord {
  return {
    protocol: "NORAUTO_DATA_LIFECYCLE_V1",
    workspaceId: row.workspace_id,
    opportunityId: row.opportunity_id,
    state: row.state,
    requestRef: row.request_ref ?? undefined,
    requestAuthority: row.request_authority ?? undefined,
    requestedAt: iso(row.requested_at),
    legalHoldRef: row.legal_hold_ref ?? undefined,
    legalHoldAuthority: row.legal_hold_authority ?? undefined,
    legalHoldObservedAt: iso(row.legal_hold_observed_at),
    primaryRedactedAt: iso(row.primary_redacted_at),
    backupDisposition: row.backup_disposition,
    backupDispositionRef: row.backup_disposition_ref ?? undefined,
    externalCopies: row.external_copies,
    authorityEffect: "NONE",
  };
}

async function readLifecycleForUpdate(client: PoolClient, workspaceId: string, opportunityId: string) {
  const result = await client.query<LifecycleDbRow>(
    `SELECT workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
            legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
            backup_disposition, backup_disposition_ref, external_copies
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2
      FOR UPDATE`,
    [workspaceId, opportunityId],
  );
  return result.rows[0] ? mapLifecycleRow(result.rows[0]) : null;
}

async function readLifecycle(input: { pool: Pool; workspaceId: string; opportunityId: string }) {
  const result = await input.pool.query<LifecycleDbRow>(
    `SELECT workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
            legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
            backup_disposition, backup_disposition_ref, external_copies
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2`,
    [input.workspaceId, input.opportunityId],
  );
  return result.rows[0] ? mapLifecycleRow(result.rows[0]) : null;
}

export async function requestPrimaryRedaction(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  requestRef: string;
  requestAuthority: string;
  requestedAt: string;
  externalCopies?: DataLifecycleRecord["externalCopies"];
}) {
  const requested = createRedactionRequest(input);
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await readLifecycleForUpdate(client, requested.workspaceId, requested.opportunityId);
    if (existing && existing.state !== "ACTIVE") {
      throw new Error(`DATA_LIFECYCLE_REQUEST_REFUSED_FROM_${existing.state}`);
    }

    const result = await client.query<LifecycleDbRow>(
      `INSERT INTO crm_data_lifecycle (
          workspace_id, opportunity_id, state,
          request_ref, request_authority, requested_at,
          backup_disposition, external_copies, authority_effect
       ) VALUES ($1, $2, 'REDACTION_REQUESTED', $3, $4, $5::timestamptz, 'UNKNOWN', $6, 'NONE')
       ON CONFLICT (workspace_id, opportunity_id) DO UPDATE SET
          state = 'REDACTION_REQUESTED',
          request_ref = EXCLUDED.request_ref,
          request_authority = EXCLUDED.request_authority,
          requested_at = EXCLUDED.requested_at,
          external_copies = EXCLUDED.external_copies
       WHERE crm_data_lifecycle.state = 'ACTIVE'
       RETURNING workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
                 legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
                 backup_disposition, backup_disposition_ref, external_copies`,
      [
        requested.workspaceId,
        requested.opportunityId,
        requested.requestRef,
        requested.requestAuthority,
        requested.requestedAt,
        requested.externalCopies,
      ],
    );

    if (result.rowCount !== 1 || !result.rows[0]) {
      await client.query("ROLLBACK");
      const current = await readLifecycle({
        pool: input.pool,
        workspaceId: requested.workspaceId,
        opportunityId: requested.opportunityId,
      });
      if (!current) throw new Error("DATA_LIFECYCLE_REQUEST_CONFLICT_STATE_MISSING");
      throw new Error(`DATA_LIFECYCLE_REQUEST_REFUSED_FROM_${current.state}`);
    }

    await client.query("COMMIT");
    const record = mapLifecycleRow(result.rows[0]);
    const decision = evaluateDataLifecycle(record);
    if (decision.decision !== "REDACT_PRIMARY") throw new Error("DATA_LIFECYCLE_REQUEST_PERSISTENCE_DRIFT");
    return record;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original lifecycle error; a prior explicit rollback may already have closed the transaction.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function placeLegalHold(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  legalHoldRef: string;
  legalHoldAuthority: string;
  observedAt: string;
}) {
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const current = await readLifecycleForUpdate(client, input.workspaceId.trim(), input.opportunityId.trim());
    const seed: DataLifecycleRecord = current ?? {
      protocol: "NORAUTO_DATA_LIFECYCLE_V1",
      workspaceId: input.workspaceId.trim(),
      opportunityId: input.opportunityId.trim(),
      state: "ACTIVE",
      backupDisposition: "UNKNOWN",
      externalCopies: "NOT_KNOWN",
      authorityEffect: "NONE",
    };
    const held = applyLegalHold({
      record: seed,
      legalHoldRef: input.legalHoldRef,
      legalHoldAuthority: input.legalHoldAuthority,
      observedAt: input.observedAt,
    });
    const result = await client.query<LifecycleDbRow>(
      `INSERT INTO crm_data_lifecycle (
          workspace_id, opportunity_id, state,
          legal_hold_ref, legal_hold_authority, legal_hold_observed_at,
          backup_disposition, external_copies, authority_effect
       ) VALUES ($1, $2, 'LEGAL_HOLD', $3, $4, $5::timestamptz, $6, $7, 'NONE')
       ON CONFLICT (workspace_id, opportunity_id) DO UPDATE SET
          state = 'LEGAL_HOLD',
          legal_hold_ref = EXCLUDED.legal_hold_ref,
          legal_hold_authority = EXCLUDED.legal_hold_authority,
          legal_hold_observed_at = EXCLUDED.legal_hold_observed_at
       WHERE crm_data_lifecycle.state NOT IN ('PRIMARY_REDACTED_BACKUP_PENDING', 'PRIMARY_REDACTED_BACKUP_EXPIRED')
       RETURNING workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
                 legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
                 backup_disposition, backup_disposition_ref, external_copies`,
      [
        held.workspaceId,
        held.opportunityId,
        held.legalHoldRef,
        held.legalHoldAuthority,
        held.legalHoldObservedAt,
        held.backupDisposition,
        held.externalCopies,
      ],
    );
    if (result.rowCount !== 1 || !result.rows[0]) {
      throw new Error("DATA_LIFECYCLE_LEGAL_HOLD_CANNOT_RESTORE_REDACTED_PII");
    }
    await client.query("COMMIT");
    return mapLifecycleRow(result.rows[0]);
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
    throw error;
  } finally {
    client.release();
  }
}

export async function attachConversationRedactionTarget(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  provider: string;
  eventId: string;
  targetRef: string;
}) {
  const result = await input.pool.query(
    `INSERT INTO crm_data_lifecycle_conversation_targets (
        workspace_id, opportunity_id, provider, event_id, target_ref
     )
     SELECT $1, $2, $3, $4, $5
      WHERE EXISTS (
        SELECT 1 FROM crm_data_lifecycle
         WHERE workspace_id = $1 AND opportunity_id = $2 AND state = 'REDACTION_REQUESTED'
      )
     ON CONFLICT (workspace_id, opportunity_id, provider, event_id) DO NOTHING`,
    [
      input.workspaceId.trim(),
      input.opportunityId.trim(),
      input.provider.trim(),
      input.eventId.trim(),
      input.targetRef.trim(),
    ],
  );
  if (result.rowCount !== 1) throw new Error("DATA_LIFECYCLE_CONVERSATION_TARGET_NOT_ATTACHED");
}

export async function executePrimaryRedaction(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  redactedAt: string;
}): Promise<PrimaryRedactionReceipt> {
  const redactedAt = new Date(input.redactedAt);
  if (!Number.isFinite(redactedAt.getTime())) throw new Error("DATA_LIFECYCLE_REDACTED_AT_INVALID_TIMESTAMP");
  const result = await input.pool.query<{
    receipt_id: string;
    conversation_targets_redacted: number;
  }>(
    `SELECT receipt_id, conversation_targets_redacted
       FROM norautomatch_apply_primary_redaction($1, $2, $3::timestamptz)`,
    [input.workspaceId.trim(), input.opportunityId.trim(), redactedAt.toISOString()],
  );
  const receipt = result.rows[0];
  if (!receipt) throw new Error("DATA_LIFECYCLE_REDACTION_RECEIPT_MISSING");
  const lifecycle = await input.pool.query<LifecycleDbRow & { local_conversation_disposition: PrimaryRedactionReceipt["localConversationTruth"] }>(
    `SELECT workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
            legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
            backup_disposition, backup_disposition_ref, external_copies, local_conversation_disposition
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2`,
    [input.workspaceId.trim(), input.opportunityId.trim()],
  );
  const row = lifecycle.rows[0];
  if (!row || row.state !== "PRIMARY_REDACTED_BACKUP_PENDING") {
    throw new Error("DATA_LIFECYCLE_PRIMARY_REDACTION_STATE_DRIFT");
  }
  return {
    protocol: "NORAUTO_PRIMARY_REDACTION_RECEIPT_V1",
    receiptId: receipt.receipt_id,
    workspaceId: row.workspace_id,
    opportunityId: row.opportunity_id,
    conversationTargetsRedacted: Number(receipt.conversation_targets_redacted),
    localConversationTruth: row.local_conversation_disposition,
    backupTruth: "PENDING_SEPARATE_DISPOSITION",
    externalCopyTruth: row.external_copies,
    authorityEffect: "NONE",
  };
}

export async function resolveBackupDisposition(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  dispositionRef: string;
}) {
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const current = await readLifecycleForUpdate(client, input.workspaceId.trim(), input.opportunityId.trim());
    if (!current) throw new Error("DATA_LIFECYCLE_RECORD_NOT_FOUND");
    const resolved = markBackupResolved({ record: current, dispositionRef: input.dispositionRef });
    const result = await client.query<LifecycleDbRow>(
      `UPDATE crm_data_lifecycle
          SET state = 'PRIMARY_REDACTED_BACKUP_EXPIRED',
              backup_disposition = 'EXPIRED_OR_PURGED',
              backup_disposition_ref = $3
        WHERE workspace_id = $1 AND opportunity_id = $2
        RETURNING workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
                  legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
                  backup_disposition, backup_disposition_ref, external_copies`,
      [resolved.workspaceId, resolved.opportunityId, resolved.backupDispositionRef],
    );
    await client.query("COMMIT");
    return mapLifecycleRow(result.rows[0]);
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
    throw error;
  } finally {
    client.release();
  }
}
