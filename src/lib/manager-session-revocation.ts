import { createHash } from "node:crypto";
import type { Pool } from "pg";

const EVIDENCE_REF_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$/;
const AUTHORITY_PATTERN = /^[A-Z][A-Z0-9_:-]{2,127}$/;

function bounded(value: string, label: string, max: number) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label}_REQUIRED`);
  if (normalized.length > max) throw new Error(`${label}_TOO_LONG`);
  return normalized;
}

function evidenceRef(value: string) {
  const normalized = bounded(value, "MANAGER_SESSION_REVOCATION_REF", 256);
  if (!EVIDENCE_REF_PATTERN.test(normalized)) throw new Error("MANAGER_SESSION_REVOCATION_REF_INVALID_IDENTIFIER");
  return normalized;
}

function authority(value: string) {
  const normalized = bounded(value, "MANAGER_SESSION_REVOCATION_AUTHORITY", 128);
  if (!AUTHORITY_PATTERN.test(normalized)) throw new Error("MANAGER_SESSION_REVOCATION_AUTHORITY_INVALID_IDENTIFIER");
  return normalized;
}

function iso(value: string, label: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${label}_INVALID_TIMESTAMP`);
  return date.toISOString();
}

export function hashManagerSessionNonce(nonce: string) {
  const normalized = bounded(nonce, "MANAGER_SESSION_NONCE", 256);
  if (normalized.length < 16) throw new Error("MANAGER_SESSION_NONCE_TOO_SHORT");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export async function isManagerSessionDurablyRevoked(input: {
  pool: Pool;
  workspaceId: string;
  nonce: string;
}) {
  const workspaceId = bounded(input.workspaceId, "MANAGER_SESSION_WORKSPACE", 128);
  const nonceHash = hashManagerSessionNonce(input.nonce);
  const result = await input.pool.query<{ revoked: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM crm_manager_session_revocations
        WHERE workspace_id = $1 AND nonce_sha256 = $2
     ) AS revoked`,
    [workspaceId, nonceHash],
  );
  return result.rows[0]?.revoked === true;
}

export async function revokeManagerSession(input: {
  pool: Pool;
  workspaceId: string;
  subjectId: string;
  nonce: string;
  expiresAt: string;
  revokedAt: string;
  revocationRef: string;
  revocationAuthority: string;
}) {
  const workspaceId = bounded(input.workspaceId, "MANAGER_SESSION_WORKSPACE", 128);
  const subjectId = bounded(input.subjectId, "MANAGER_SESSION_SUBJECT", 256);
  const nonceHash = hashManagerSessionNonce(input.nonce);
  const expiresAt = iso(input.expiresAt, "MANAGER_SESSION_EXPIRES_AT");
  const revokedAt = iso(input.revokedAt, "MANAGER_SESSION_REVOKED_AT");
  if (Date.parse(expiresAt) <= Date.parse(revokedAt)) throw new Error("MANAGER_SESSION_REVOCATION_REQUIRES_UNEXPIRED_SESSION");
  const revocationRef = evidenceRef(input.revocationRef);
  const revocationAuthority = authority(input.revocationAuthority);

  const result = await input.pool.query<{
    workspace_id: string;
    nonce_sha256: string;
    subject_id: string;
    expires_at: Date | string;
    revoked_at: Date | string;
    revocation_ref: string;
    revocation_authority: string;
  }>(
    `INSERT INTO crm_manager_session_revocations (
       workspace_id, nonce_sha256, subject_id, expires_at, revoked_at,
       revocation_ref, revocation_authority, authority_effect
     ) VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, 'NONE')
     ON CONFLICT (workspace_id, nonce_sha256) DO NOTHING
     RETURNING workspace_id, nonce_sha256, subject_id, expires_at, revoked_at,
               revocation_ref, revocation_authority`,
    [workspaceId, nonceHash, subjectId, expiresAt, revokedAt, revocationRef, revocationAuthority],
  );

  if (result.rowCount === 1 && result.rows[0]) {
    return { status: "REVOKED" as const, nonceHash, authorityEffect: "NONE" as const };
  }

  const existing = await input.pool.query<{
    subject_id: string;
    expires_at: Date | string;
    revoked_at: Date | string;
    revocation_ref: string;
    revocation_authority: string;
  }>(
    `SELECT subject_id, expires_at, revoked_at, revocation_ref, revocation_authority
       FROM crm_manager_session_revocations
      WHERE workspace_id = $1 AND nonce_sha256 = $2`,
    [workspaceId, nonceHash],
  );
  const row = existing.rows[0];
  if (!row) throw new Error("MANAGER_SESSION_REVOCATION_CONFLICT_STATE_MISSING");
  const same =
    row.subject_id === subjectId &&
    new Date(row.expires_at).toISOString() === expiresAt &&
    new Date(row.revoked_at).toISOString() === revokedAt &&
    row.revocation_ref === revocationRef &&
    row.revocation_authority === revocationAuthority;
  if (!same) throw new Error("MANAGER_SESSION_REVOCATION_EVIDENCE_CONFLICT");
  return { status: "ALREADY_REVOKED_SAME_EVIDENCE" as const, nonceHash, authorityEffect: "NONE" as const };
}
