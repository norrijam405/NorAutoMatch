import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { ManagerSessionClaims } from "./manager-session-auth";

const IDENTIFIER_REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,511}$/;
const AUTHORITY_TOKEN = /^[A-Z][A-Z0-9_:-]{1,127}$/;

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function isManagerSessionDurablyRevoked(input: {
  pool: Pool;
  claims: ManagerSessionClaims;
}) {
  const result = await input.pool.query<{ revoked: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM crm_manager_session_revocations
       WHERE workspace_id = $1
         AND nonce_sha256 = $2
     ) AS revoked`,
    [input.claims.workspaceId, sha256(input.claims.nonce)],
  );
  return result.rows[0]?.revoked === true;
}

export async function recordManagerSessionRevocation(input: {
  pool: Pool;
  claims: ManagerSessionClaims;
  revokedAt: string;
  revokedBy: string;
  evidenceRef: string;
  reasonCode: string;
}) {
  const revokedAtMs = Date.parse(input.revokedAt);
  if (!Number.isFinite(revokedAtMs)) throw new Error("Manager session revocation requires a valid revokedAt timestamp.");
  const expiresAtMs = input.claims.expiresAt * 1000;
  if (revokedAtMs >= expiresAtMs) throw new Error("Expired manager sessions do not require durable revocation.");
  if (!AUTHORITY_TOKEN.test(input.revokedBy)) throw new Error("Manager session revocation requires a bounded authority token.");
  if (!IDENTIFIER_REF.test(input.evidenceRef)) throw new Error("Manager session revocation requires a machine-formatted evidence reference.");
  if (!AUTHORITY_TOKEN.test(input.reasonCode)) throw new Error("Manager session revocation requires a bounded reason code.");

  const nonceFingerprint = sha256(input.claims.nonce);
  const subjectFingerprint = sha256(input.claims.subjectId);
  const result = await input.pool.query<{ nonce_sha256: string }>(
    `INSERT INTO crm_manager_session_revocations (
       workspace_id, nonce_sha256, subject_id_sha256, session_expires_at,
       revoked_at, revoked_by, evidence_ref, reason_code
     ) VALUES ($1, $2, $3, to_timestamp($4), $5::timestamptz, $6, $7, $8)
     ON CONFLICT (workspace_id, nonce_sha256) DO NOTHING
     RETURNING nonce_sha256`,
    [
      input.claims.workspaceId,
      nonceFingerprint,
      subjectFingerprint,
      input.claims.expiresAt,
      input.revokedAt,
      input.revokedBy,
      input.evidenceRef,
      input.reasonCode,
    ],
  );

  if (result.rowCount === 1) return { status: "RECORDED" as const, nonceFingerprint };

  const existing = await input.pool.query<{
    subject_id_sha256: string;
    session_expires_at: Date;
    revoked_at: Date;
    revoked_by: string;
    evidence_ref: string;
    reason_code: string;
  }>(
    `SELECT subject_id_sha256, session_expires_at, revoked_at, revoked_by, evidence_ref, reason_code
     FROM crm_manager_session_revocations
     WHERE workspace_id = $1 AND nonce_sha256 = $2`,
    [input.claims.workspaceId, nonceFingerprint],
  );
  const row = existing.rows[0];
  const exactReplay = row &&
    row.subject_id_sha256 === subjectFingerprint &&
    row.session_expires_at.toISOString() === new Date(expiresAtMs).toISOString() &&
    row.revoked_at.toISOString() === new Date(revokedAtMs).toISOString() &&
    row.revoked_by === input.revokedBy &&
    row.evidence_ref === input.evidenceRef &&
    row.reason_code === input.reasonCode;
  if (!exactReplay) throw new Error("Manager session revocation evidence conflict.");
  return { status: "DEDUPLICATED" as const, nonceFingerprint };
}
