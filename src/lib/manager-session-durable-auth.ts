import type { Pool } from "pg";
import type { ManagerSessionAuthResult } from "./manager-session-auth";
import { isManagerSessionDurablyRevoked } from "./manager-session-revocation";

export type DurableManagerSessionResult =
  | Extract<ManagerSessionAuthResult, { authorized: true }>
  | Extract<ManagerSessionAuthResult, { authorized: false }>
  | { authorized: false; reason: "REVOCATION_CHECK_FAILED" };

export async function enforceDurableManagerSessionRevocation(input: {
  pool: Pool;
  auth: ManagerSessionAuthResult;
}): Promise<DurableManagerSessionResult> {
  if (!input.auth.authorized) return input.auth;
  try {
    const revoked = await isManagerSessionDurablyRevoked({ pool: input.pool, claims: input.auth.claims });
    if (revoked) return { authorized: false, reason: "REVOKED" };
    return input.auth;
  } catch {
    return { authorized: false, reason: "REVOCATION_CHECK_FAILED" };
  }
}
