import { Pool } from "pg";
import type { MachineServiceAssertionClaims } from "../src/lib/machine-service-auth";
import { consumeMachineAssertionNonce } from "../src/lib/machine-service-replay";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for machine replay integration test.");

  const pool = new Pool({ connectionString });
  const base: MachineServiceAssertionClaims = {
    protocol: "NORAUTO_MACHINE_ASSERTION_V1",
    issuerService: "conversation-provider-adapter",
    audience: "CONVERSATION_GATEWAY",
    workspaceId: "norautomatch",
    issuedAt: 1_789_000_000,
    expiresAt: 1_789_000_120,
    nonce: "machine-replay-nonce-0001",
  };

  try {
    await pool.query("DELETE FROM crm_machine_assertion_nonces WHERE workspace_id = $1", [base.workspaceId]);

    const first = await consumeMachineAssertionNonce({ pool, claims: base });
    assert(first.consumed, "First use of a scoped machine nonce must be durably accepted.");

    const replay = await consumeMachineAssertionNonce({ pool, claims: base });
    assert(!replay.consumed && replay.reason === "REPLAYED", "Exact machine assertion nonce replay must be rejected.");

    const otherAudience = await consumeMachineAssertionNonce({
      pool,
      claims: { ...base, audience: "CRM_RELAY" },
    });
    assert(otherAudience.consumed, "Same nonce under a different audience must remain independently scoped.");

    const otherIssuer = await consumeMachineAssertionNonce({
      pool,
      claims: { ...base, issuerService: "different-service" },
    });
    assert(otherIssuer.consumed, "Same nonce under a different issuer service must remain independently scoped.");

    const otherWorkspace = await consumeMachineAssertionNonce({
      pool,
      claims: { ...base, workspaceId: "other-workspace" },
    });
    assert(otherWorkspace.consumed, "Same nonce under a different workspace must remain independently scoped.");

    const persisted = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM crm_machine_assertion_nonces
        WHERE nonce = $1`,
      [base.nonce],
    );
    assert(persisted.rows[0]?.count === "4", "Replay ledger must preserve exactly four distinct scoped nonce consumptions.");

    console.log("PASS_MACHINE_SERVICE_DURABLE_REPLAY_BOUNDARY");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
