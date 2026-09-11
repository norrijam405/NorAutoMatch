import type { Pool } from "pg";
import type { MachineServiceAssertionClaims } from "./machine-service-auth";

export type MachineAssertionReplayResult =
  | { consumed: true }
  | { consumed: false; reason: "REPLAYED" };

export async function consumeMachineAssertionNonce(input: {
  pool: Pool;
  claims: MachineServiceAssertionClaims;
}): Promise<MachineAssertionReplayResult> {
  const { claims } = input;
  const result = await input.pool.query(
    `INSERT INTO crm_machine_assertion_nonces (
       workspace_id, audience, issuer_service, nonce, issued_at, expires_at
     ) VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
     ON CONFLICT (workspace_id, audience, issuer_service, nonce) DO NOTHING
     RETURNING nonce`,
    [
      claims.workspaceId,
      claims.audience,
      claims.issuerService,
      claims.nonce,
      claims.issuedAt,
      claims.expiresAt,
    ],
  );

  return result.rowCount === 1
    ? { consumed: true }
    : { consumed: false, reason: "REPLAYED" };
}
