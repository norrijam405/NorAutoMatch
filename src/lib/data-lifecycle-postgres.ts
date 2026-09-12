import type { Pool, PoolClient } from "pg";
import {
  createRedactionRequest,
  evaluateDataLifecycle,
  markBackupResolved,
  markExternalCopiesRemoved,
  requireLifecycleAuthority,
  requireLifecycleEvidenceRef,
  requireLifecycleIso,
  type DataLifecycleRecord,
  type InitialExternalCopyTruth,
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
  backup_disposition_authority: string | null;
  backup_disposition_observed_at: Date | string | null;
  external_copies: DataLifecycleRecord["externalCopies"];
  external_disposition_ref: string | null;
  external_disposition_authority: string | null;
  external_disposition_observed_at: Date | string | null;
};

type LegalHoldDbRow = {
  hold_id: string;
  workspace_id: string;
  opportunity_id: string;
  hold_ref: string;
  hold_authority: string;
  placed_at: Date | string;
  release_ref: string | null;
  release_authority: string | null;
  released_at: Date | string | null;
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

export type LegalHoldReceipt = {
  protocol: "NORAUTO_LEGAL_HOLD_RECEIPT_V1";
  status: "PLACED" | "DEDUPLICATED" | "RELEASED";
  workspaceId: string;
  opportunityId: string;
  holdRef: string;
  holdAuthority: string;
  placedAt: string;
  releaseRef?: string;
  releaseAuthority?: string;
  releasedAt?: string;
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
    backupDispositionAuthority: row.backup_disposition_authority ?? undefined,
    backupDispositionObservedAt: iso(row.backup_disposition_observed_at),
    externalCopies: row.external_copies,
    externalDispositionRef: row.external_disposition_ref ?? undefined,
    externalDispositionAuthority: row.external_disposition_authority ?? undefined,
    externalDispositionObservedAt: iso(row.external_disposition_observed_at),
    authorityEffect: "NONE",
  };
}

function mapHoldReceipt(row: LegalHoldDbRow, status: LegalHoldReceipt["status"]): LegalHoldReceipt {
  return {
    protocol: "NORAUTO_LEGAL_HOLD_RECEIPT_V1",
    status,
    workspaceId: row.workspace_id,
    opportunityId: row.opportunity_id,
    holdRef: row.hold_ref,
    holdAuthority: row.hold_authority,
    placedAt: iso(row.placed_at)!,
    releaseRef: row.release_ref ?? undefined,
    releaseAuthority: row.release_authority ?? undefined,
    releasedAt: iso(row.released_at),
    authorityEffect: "NONE",
  };
}

const lifecycleColumns = `workspace_id, opportunity_id, state, request_ref, request_authority, requested_at,
  legal_hold_ref, legal_hold_authority, legal_hold_observed_at, primary_redacted_at,
  backup_disposition, backup_disposition_ref, backup_disposition_authority, backup_disposition_observed_at,
  external_copies, external_disposition_ref, external_disposition_authority, external_disposition_observed_at`;

async function readLifecycleForUpdate(client: PoolClient, workspaceId: string, opportunityId: string) {
  const result = await client.query<LifecycleDbRow>(
    `SELECT ${lifecycleColumns}
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2
      FOR UPDATE`,
    [workspaceId, opportunityId],
  );
  return result.rows[0] ? mapLifecycleRow(result.rows[0]) : null;
}

async function readLifecycle(input: { pool: Pool; workspaceId: string; opportunityId: string }) {
  const result = await input.pool.query<LifecycleDbRow>(
    `SELECT ${lifecycleColumns}
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2`,
    [input.workspaceId, input.opportunityId],
  );
  return result.rows[0] ? mapLifecycleRow(result.rows[0]) : null;
}

async function ensureLifecycleRecord(client: PoolClient, workspaceId: string, opportunityId: string) {
  await client.query(
    `INSERT INTO crm_data_lifecycle (
       workspace_id, opportunity_id, state, backup_disposition, external_copies, authority_effect
     ) VALUES ($1, $2, 'ACTIVE', 'UNKNOWN', 'NOT_KNOWN', 'NONE')
     ON CONFLICT (workspace_id, opportunity_id) DO NOTHING`,
    [workspaceId, opportunityId],
  );
}

async function activeLegalHoldExists(client: PoolClient, workspaceId: string, opportunityId: string) {
  const result = await client.query(
    `SELECT 1
       FROM crm_data_lifecycle_legal_holds
      WHERE workspace_id = $1 AND opportunity_id = $2 AND released_at IS NULL
      LIMIT 1`,
    [workspaceId, opportunityId],
  );
  return result.rowCount === 1;
}

export async function requestPrimaryRedaction(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  requestRef: string;
  requestAuthority: string;
  requestedAt: string;
  externalCopies?: InitialExternalCopyTruth;
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
       RETURNING ${lifecycleColumns}`,
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
    try { await client.query("ROLLBACK"); } catch { /* preserve original lifecycle error */ }
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
}): Promise<LegalHoldReceipt> {
  const workspaceId = input.workspaceId.trim();
  const opportunityId = input.opportunityId.trim();
  const holdRef = requireLifecycleEvidenceRef(input.legalHoldRef, "DATA_LIFECYCLE_HOLD_REF");
  const holdAuthority = requireLifecycleAuthority(input.legalHoldAuthority, "DATA_LIFECYCLE_HOLD_AUTHORITY");
  const placedAt = requireLifecycleIso(input.observedAt, "DATA_LIFECYCLE_HOLD_OBSERVED_AT");
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    await ensureLifecycleRecord(client, workspaceId, opportunityId);
    await readLifecycleForUpdate(client, workspaceId, opportunityId);

    const existing = await client.query<LegalHoldDbRow>(
      `SELECT hold_id, workspace_id, opportunity_id, hold_ref, hold_authority, placed_at,
              release_ref, release_authority, released_at
         FROM crm_data_lifecycle_legal_holds
        WHERE workspace_id = $1 AND opportunity_id = $2 AND hold_ref = $3
        FOR UPDATE`,
      [workspaceId, opportunityId, holdRef],
    );
    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (row.hold_authority !== holdAuthority || iso(row.placed_at) !== placedAt) {
        throw new Error("DATA_LIFECYCLE_LEGAL_HOLD_EVIDENCE_CONFLICT");
      }
      await client.query("COMMIT");
      return mapHoldReceipt(row, "DEDUPLICATED");
    }

    const inserted = await client.query<LegalHoldDbRow>(
      `INSERT INTO crm_data_lifecycle_legal_holds (
         workspace_id, opportunity_id, hold_ref, hold_authority, placed_at
       ) VALUES ($1, $2, $3, $4, $5::timestamptz)
       RETURNING hold_id, workspace_id, opportunity_id, hold_ref, hold_authority, placed_at,
                 release_ref, release_authority, released_at`,
      [workspaceId, opportunityId, holdRef, holdAuthority, placedAt],
    );
    await client.query("COMMIT");
    return mapHoldReceipt(inserted.rows[0], "PLACED");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original hold error */ }
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseLegalHold(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  legalHoldRef: string;
  releaseRef: string;
  releaseAuthority: string;
  releasedAt: string;
}): Promise<LegalHoldReceipt> {
  const workspaceId = input.workspaceId.trim();
  const opportunityId = input.opportunityId.trim();
  const holdRef = requireLifecycleEvidenceRef(input.legalHoldRef, "DATA_LIFECYCLE_HOLD_REF");
  const releaseRef = requireLifecycleEvidenceRef(input.releaseRef, "DATA_LIFECYCLE_HOLD_RELEASE_REF");
  const releaseAuthority = requireLifecycleAuthority(input.releaseAuthority, "DATA_LIFECYCLE_HOLD_RELEASE_AUTHORITY");
  const releasedAt = requireLifecycleIso(input.releasedAt, "DATA_LIFECYCLE_HOLD_RELEASED_AT");
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const lifecycle = await readLifecycleForUpdate(client, workspaceId, opportunityId);
    if (!lifecycle) throw new Error("DATA_LIFECYCLE_RECORD_NOT_FOUND");

    const existing = await client.query<LegalHoldDbRow>(
      `SELECT hold_id, workspace_id, opportunity_id, hold_ref, hold_authority, placed_at,
              release_ref, release_authority, released_at
         FROM crm_data_lifecycle_legal_holds
        WHERE workspace_id = $1 AND opportunity_id = $2 AND hold_ref = $3
        FOR UPDATE`,
      [workspaceId, opportunityId, holdRef],
    );
    const row = existing.rows[0];
    if (!row) throw new Error("DATA_LIFECYCLE_LEGAL_HOLD_NOT_FOUND");

    if (row.released_at) {
      if (row.release_ref !== releaseRef || row.release_authority !== releaseAuthority || iso(row.released_at) !== releasedAt) {
        throw new Error("DATA_LIFECYCLE_LEGAL_HOLD_RELEASE_EVIDENCE_CONFLICT");
      }
      await client.query("COMMIT");
      return mapHoldReceipt(row, "DEDUPLICATED");
    }

    const updated = await client.query<LegalHoldDbRow>(
      `UPDATE crm_data_lifecycle_legal_holds
          SET release_ref = $4, release_authority = $5, released_at = $6::timestamptz
        WHERE workspace_id = $1 AND opportunity_id = $2 AND hold_ref = $3 AND released_at IS NULL
        RETURNING hold_id, workspace_id, opportunity_id, hold_ref, hold_authority, placed_at,
                  release_ref, release_authority, released_at`,
      [workspaceId, opportunityId, holdRef, releaseRef, releaseAuthority, releasedAt],
    );
    if (updated.rowCount !== 1) throw new Error("DATA_LIFECYCLE_LEGAL_HOLD_RELEASE_LOST_STATE");

    if (lifecycle.state === "LEGAL_HOLD" && !(await activeLegalHoldExists(client, workspaceId, opportunityId))) {
      await client.query(
        `UPDATE crm_data_lifecycle
            SET state = CASE WHEN request_ref IS NULL THEN 'ACTIVE' ELSE 'REDACTION_REQUESTED' END
          WHERE workspace_id = $1 AND opportunity_id = $2 AND state = 'LEGAL_HOLD'`,
        [workspaceId, opportunityId],
      );
    }

    await client.query("COMMIT");
    return mapHoldReceipt(updated.rows[0], "RELEASED");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original release error */ }
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
  const targetRef = requireLifecycleEvidenceRef(input.targetRef, "DATA_LIFECYCLE_TARGET_REF");
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
    [input.workspaceId.trim(), input.opportunityId.trim(), input.provider.trim(), input.eventId.trim(), targetRef],
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
  const result = await input.pool.query<{ receipt_id: string; conversation_targets_redacted: number }>(
    `SELECT receipt_id, conversation_targets_redacted
       FROM norautomatch_apply_primary_redaction($1, $2, $3::timestamptz)`,
    [input.workspaceId.trim(), input.opportunityId.trim(), redactedAt.toISOString()],
  );
  const receipt = result.rows[0];
  if (!receipt) throw new Error("DATA_LIFECYCLE_REDACTION_RECEIPT_MISSING");
  const lifecycle = await input.pool.query<LifecycleDbRow & { local_conversation_disposition: PrimaryRedactionReceipt["localConversationTruth"] }>(
    `SELECT ${lifecycleColumns}, local_conversation_disposition
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
  dispositionAuthority: string;
  observedAt: string;
}) {
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const current = await readLifecycleForUpdate(client, input.workspaceId.trim(), input.opportunityId.trim());
    if (!current) throw new Error("DATA_LIFECYCLE_RECORD_NOT_FOUND");
    if (await activeLegalHoldExists(client, current.workspaceId, current.opportunityId)) {
      throw new Error("DATA_LIFECYCLE_BACKUP_BLOCKED_BY_LEGAL_HOLD");
    }
    const resolved = markBackupResolved({
      record: current,
      dispositionRef: input.dispositionRef,
      dispositionAuthority: input.dispositionAuthority,
      observedAt: input.observedAt,
    });
    const result = await client.query<LifecycleDbRow>(
      `UPDATE crm_data_lifecycle
          SET state = 'PRIMARY_REDACTED_BACKUP_EXPIRED',
              backup_disposition = 'EXPIRED_OR_PURGED',
              backup_disposition_ref = $3,
              backup_disposition_authority = $4,
              backup_disposition_observed_at = $5::timestamptz
        WHERE workspace_id = $1 AND opportunity_id = $2
        RETURNING ${lifecycleColumns}`,
      [
        resolved.workspaceId,
        resolved.opportunityId,
        resolved.backupDispositionRef,
        resolved.backupDispositionAuthority,
        resolved.backupDispositionObservedAt,
      ],
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

export async function confirmExternalCopiesRemoved(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  dispositionRef: string;
  dispositionAuthority: string;
  observedAt: string;
}) {
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const current = await readLifecycleForUpdate(client, input.workspaceId.trim(), input.opportunityId.trim());
    if (!current) throw new Error("DATA_LIFECYCLE_RECORD_NOT_FOUND");
    if (await activeLegalHoldExists(client, current.workspaceId, current.opportunityId)) {
      throw new Error("DATA_LIFECYCLE_EXTERNAL_DISPOSITION_BLOCKED_BY_LEGAL_HOLD");
    }
    const resolved = markExternalCopiesRemoved({
      record: current,
      dispositionRef: input.dispositionRef,
      dispositionAuthority: input.dispositionAuthority,
      observedAt: input.observedAt,
    });
    const result = await client.query<LifecycleDbRow>(
      `UPDATE crm_data_lifecycle
          SET external_copies = 'SEPARATELY_CONFIRMED_REMOVED',
              external_disposition_ref = $3,
              external_disposition_authority = $4,
              external_disposition_observed_at = $5::timestamptz
        WHERE workspace_id = $1 AND opportunity_id = $2
        RETURNING ${lifecycleColumns}`,
      [
        resolved.workspaceId,
        resolved.opportunityId,
        resolved.externalDispositionRef,
        resolved.externalDispositionAuthority,
        resolved.externalDispositionObservedAt,
      ],
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
