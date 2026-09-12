import assert from "node:assert/strict";
import { Pool } from "pg";
import type { ManagerSessionClaims, ManagerSessionAuthResult } from "../src/lib/manager-session-auth";
import { enforceDurableManagerSessionRevocation } from "../src/lib/manager-session-durable-auth";
import { isManagerSessionDurablyRevoked, recordManagerSessionRevocation } from "../src/lib/manager-session-revocation";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for manager revocation integration.");

const pool = new Pool({ connectionString });
const claims: ManagerSessionClaims = {
  protocol: "NORAUTO_MANAGER_SESSION_V1",
  subjectId: "manager:integration-001",
  workspaceId: "norautomatch",
  role: "MANAGER",
  verifier: "integration-verifier",
  evidenceRef: "manager-session:integration-001",
  issuedAt: 1789185600,
  expiresAt: 1789189200,
  nonce: "manager-revocation-nonce-001",
};
const authorized: ManagerSessionAuthResult = {
  authorized: true,
  claims,
  actor: {
    state: "VERIFIED",
    subjectId: claims.subjectId,
    verifier: claims.verifier,
    verifiedAt: new Date(claims.issuedAt * 1000).toISOString(),
    evidenceRef: claims.evidenceRef,
  },
};

async function main() {
  await pool.query(`DELETE FROM crm_manager_session_revocations WHERE false`);

  const before = await enforceDurableManagerSessionRevocation({ pool, auth: authorized });
  assert(before.authorized, "unrevoked manager session must remain authorized after durable check");

  const recorded = await recordManagerSessionRevocation({
    pool,
    claims,
    revokedAt: "2026-09-12T06:10:00.000Z",
    revokedBy: "SECURITY_OPERATOR",
    evidenceRef: "manager-revocation:integration-001",
    reasonCode: "SECURITY_TEST",
  });
  assert.equal(recorded.status, "RECORDED", "first revocation must be durably recorded");
  assert.equal(recorded.nonceFingerprint.length, 64, "revocation must use a SHA-256 nonce fingerprint");

  assert(await isManagerSessionDurablyRevoked({ pool, claims }), "recorded session must be durably revoked");
  const after = await enforceDurableManagerSessionRevocation({ pool, auth: authorized });
  assert(!after.authorized && after.reason === "REVOKED", "durably revoked session must be denied");

  const exactReplay = await recordManagerSessionRevocation({
    pool,
    claims,
    revokedAt: "2026-09-12T06:10:00.000Z",
    revokedBy: "SECURITY_OPERATOR",
    evidenceRef: "manager-revocation:integration-001",
    reasonCode: "SECURITY_TEST",
  });
  assert.equal(exactReplay.status, "DEDUPLICATED", "exact revocation replay must be idempotent");

  await assert.rejects(
    () => recordManagerSessionRevocation({
      pool,
      claims,
      revokedAt: "2026-09-12T06:10:00.000Z",
      revokedBy: "SECURITY_OPERATOR",
      evidenceRef: "manager-revocation:changed-evidence",
      reasonCode: "SECURITY_TEST",
    }),
    /evidence conflict/i,
    "same nonce with different evidence must fail closed",
  );

  const otherWorkspaceClaims = { ...claims, workspaceId: "other-workspace" };
  assert(!(await isManagerSessionDurablyRevoked({ pool, claims: otherWorkspaceClaims })), "revocation must not cross workspace boundaries");

  const stored = await pool.query<{ nonce_sha256: string }>(
    `SELECT nonce_sha256 FROM crm_manager_session_revocations WHERE workspace_id = $1`,
    [claims.workspaceId],
  );
  assert.equal(stored.rows.length, 1, "exactly one append-only revocation row must exist");
  assert.notEqual(stored.rows[0].nonce_sha256, claims.nonce, "raw session nonce must not be persisted");

  await assert.rejects(
    () => pool.query(
      `UPDATE crm_manager_session_revocations SET reason_code = 'CHANGED' WHERE workspace_id = $1 AND nonce_sha256 = $2`,
      [claims.workspaceId, recorded.nonceFingerprint],
    ),
    /append-only/i,
    "direct SQL must not rewrite revocation evidence",
  );
  await assert.rejects(
    () => pool.query(
      `DELETE FROM crm_manager_session_revocations WHERE workspace_id = $1 AND nonce_sha256 = $2`,
      [claims.workspaceId, recorded.nonceFingerprint],
    ),
    /append-only/i,
    "direct SQL must not delete revocation evidence",
  );

  console.log("PASS_MANAGER_SESSION_DURABLE_REVOCATION");
}

main().finally(() => pool.end());
