import type { Pool } from "pg";
import { authorizeManagerSession, type ManagerSessionAuthResult } from "./manager-session-auth";
import { isManagerSessionDurablyRevoked } from "./manager-session-revocation";

export type ManagerRequestAuthResult =
  | Extract<ManagerSessionAuthResult, { authorized: true }>
  | Extract<ManagerSessionAuthResult, { authorized: false }>
  | { authorized: false; reason: "REVOCATION_DEPENDENCY_UNAVAILABLE" };

export async function authorizeManagerRequest(input: {
  authorizationHeader: string | null | undefined;
  pool: Pool;
  expectedWorkspaceId: string;
  configuredSecret: string | undefined;
  configuredPreviousSecret?: string | undefined;
  emergencyRevokedNonces?: string | undefined;
  nowEpochSeconds?: number;
}): Promise<ManagerRequestAuthResult> {
  const base = authorizeManagerSession({
    authorizationHeader: input.authorizationHeader,
    configuredSecret: input.configuredSecret,
    configuredPreviousSecret: input.configuredPreviousSecret,
    revokedNonces: input.emergencyRevokedNonces,
    expectedWorkspaceId: input.expectedWorkspaceId,
    nowEpochSeconds: input.nowEpochSeconds,
  });
  if (!base.authorized) return base;

  try {
    const revoked = await isManagerSessionDurablyRevoked({
      pool: input.pool,
      workspaceId: base.claims.workspaceId,
      nonce: base.claims.nonce,
    });
    if (revoked) return { authorized: false, reason: "REVOKED" };
  } catch {
    // Durable revocation is part of authentication truth. A storage/read failure must fail closed.
    return { authorized: false, reason: "REVOCATION_DEPENDENCY_UNAVAILABLE" };
  }

  return base;
}
