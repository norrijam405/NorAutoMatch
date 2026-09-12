import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Pool } from "pg";
import { runCrmOutboxRelayOnce } from "../src/lib/crm-outbox-relay";
import { createPostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";
import { persistLead } from "../src/lib/crm-lead-intake";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for CRM outbox relay integration.");

const pool = new Pool({ connectionString });
const adapter = createPostgresCrmPersistenceAdapter(pool);

async function main() {
  let flakyAttempts = 0;
  let permanentFailureAttempts = 0;
  const server = createServer((req, res) => {
    try {
      if (req.url === "/flaky") {
        flakyAttempts += 1;
        res.statusCode = flakyAttempts === 1 ? 503 : 204;
      } else if (req.url === "/always-fail") {
        permanentFailureAttempts += 1;
        res.statusCode = 503;
      } else {
        res.statusCode = 204;
      }
      res.end();
    } catch {
      res.statusCode = 500;
      res.end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await pool.query(
      `TRUNCATE TABLE crm_data_lifecycle_legal_holds, crm_data_lifecycle_redaction_receipts, crm_data_lifecycle_conversation_targets,
       crm_data_lifecycle, crm_follow_up_obligations, crm_outbox, crm_manager_review_receipts,
       crm_manager_handoffs, crm_evidence, crm_opportunities RESTART IDENTITY`,
    );

    const flaky = await persistLead(adapter, "1001", "2026-09-09T04:21:00.000Z");
    const first = await runCrmOutboxRelayOnce({
      pool,
      targetUrl: `${baseUrl}/flaky`,
      limit: 1,
      allowInsecureLocalhost: true,
    });
    assert(first.length === 1 && first[0].status === "RETRY_SCHEDULED", "HTTP 503 must schedule a retry, not lose the event.");

    const firstState = await pool.query<{ delivery_state: string; attempts: number; next_attempt_at: Date | null; delivered_at: Date | null }>(
      `SELECT delivery_state, attempts, next_attempt_at, delivered_at FROM crm_outbox WHERE aggregate_id = $1`,
      [flaky.result.opportunityId],
    );
    assert(firstState.rows[0].delivery_state === "FAILED", "failed delivery must be durably marked FAILED");
    assert(firstState.rows[0].attempts === 1, "first delivery failure must record one attempt");
    assert(firstState.rows[0].next_attempt_at !== null, "retryable failure must schedule next_attempt_at");
    assert(firstState.rows[0].delivered_at === null, "failed delivery must not claim delivered_at");

    await pool.query(`UPDATE crm_outbox SET next_attempt_at = CURRENT_TIMESTAMP WHERE aggregate_id = $1`, [flaky.result.opportunityId]);
    const second = await runCrmOutboxRelayOnce({
      pool,
      targetUrl: `${baseUrl}/flaky`,
      limit: 1,
      allowInsecureLocalhost: true,
    });
    assert(second.length === 1 && second[0].status === "DELIVERED", "retry must eventually mark a successful delivery.");

    const delivered = await pool.query<{ delivery_state: string; attempts: number; delivered_at: Date | null }>(
      `SELECT delivery_state, attempts, delivered_at FROM crm_outbox WHERE aggregate_id = $1`,
      [flaky.result.opportunityId],
    );
    assert(delivered.rows[0].delivery_state === "DELIVERED", "successful retry must be durably DELIVERED");
    assert(delivered.rows[0].attempts === 2, "successful retry must record total attempts");
    assert(delivered.rows[0].delivered_at !== null, "successful retry must record delivered_at");

    const permanentlyFailing = await persistLead(adapter, "1002", "2026-09-09T04:22:00.000Z");
    await pool.query(`UPDATE crm_outbox SET max_attempts = 2 WHERE aggregate_id = $1`, [permanentlyFailing.result.opportunityId]);

    const failOne = await runCrmOutboxRelayOnce({
      pool,
      targetUrl: `${baseUrl}/always-fail`,
      limit: 1,
      allowInsecureLocalhost: true,
    });
    assert(failOne.length === 1 && failOne[0].status === "RETRY_SCHEDULED", "first permanent failure should still retry while attempts remain.");

    await pool.query(`UPDATE crm_outbox SET next_attempt_at = CURRENT_TIMESTAMP WHERE aggregate_id = $1`, [permanentlyFailing.result.opportunityId]);
    const failTwo = await runCrmOutboxRelayOnce({
      pool,
      targetUrl: `${baseUrl}/always-fail`,
      limit: 1,
      allowInsecureLocalhost: true,
    });
    assert(failTwo.length === 1 && failTwo[0].status === "FAILED_EXHAUSTED", "max attempts must stop unbounded retrying.");

    const exhausted = await pool.query<{ delivery_state: string; attempts: number; next_attempt_at: Date | null }>(
      `SELECT delivery_state, attempts, next_attempt_at FROM crm_outbox WHERE aggregate_id = $1`,
      [permanentlyFailing.result.opportunityId],
    );
    assert(exhausted.rows[0].delivery_state === "FAILED", "exhausted event remains explicitly FAILED, not silently dropped.");
    assert(exhausted.rows[0].attempts === 2, "max attempts must be durably recorded.");
    assert(exhausted.rows[0].next_attempt_at === null, "exhausted event must not schedule another retry.");
    assert(permanentFailureAttempts === 2, "relay must stop external attempts at the persisted max attempts boundary.");

    console.log("PASS_NODE_POSTGRES_LEASED_OUTBOX_RELAY");
  } finally {
    server.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
