import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { persistLeadAsCrmOpportunity } from "../src/lib/crm-lead-intake";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";
import {
  claimCrmOutboxBatch,
  deliverClaimedCrmOutboxEvent,
  runCrmOutboxRelayOnce,
  type CrmRelayDeliveryPayload,
} from "../src/lib/crm-outbox-relay";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN-RELAY-1"],
  verifiedVehicleIds: ["VIN-RELAY-1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T04:20:00.000Z",
  sourceFetchedAt: "2026-09-09T04:19:00.000Z",
  sourceHash: "f".repeat(64),
};

function leadFor(suffix: string, pipeline: LeadPayload["pipeline"] = "Standard Retail"): LeadPayload {
  return {
    firstName: "Relay",
    lastName: suffix,
    email: `relay-${suffix.toLowerCase()}@example.com`,
    phone: `405555${suffix.padStart(4, "0").slice(-4)}`,
    budgetRange: "$30,000-$40,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes: `relay integration ${suffix}`,
    source: "CI-Outbox-Relay",
    trigger: pipeline === "Vehicle Sourcing" ? "trapdoor" : "retail",
    pipeline,
    shortlistedVehicleIds: ["VIN-RELAY-1"],
    monthlyTarget: 600,
    downPayment: 4000,
    termMonths: 60,
    consent: true,
  };
}

async function persistLead(
  adapter: PostgresCrmPersistenceAdapter,
  suffix: string,
  timestamp: string,
  pipeline: LeadPayload["pipeline"] = "Standard Retail",
) {
  const lead = leadFor(suffix, pipeline);
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence, createdAt: timestamp });
  const managerHandoff = createManagerHandoff({ deskPrep, createdAt: timestamp });
  const result = await persistLeadAsCrmOpportunity({
    lead,
    inventoryEvidence,
    managerHandoff,
    submittedAt: timestamp,
    adapter,
  });
  assert(result.persistenceStatus === "COMMITTED", `lead ${suffix} must commit before relay testing`);
  return { result, managerHandoff };
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as CrmRelayDeliveryPayload;
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for outbox relay integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);
  const requestKeys: string[] = [];
  const payloads: CrmRelayDeliveryPayload[] = [];
  let flakyCalls = 0;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      requestKeys.push(String(req.headers["idempotency-key"] ?? ""));
      payloads.push(await readJson(req));
      if (req.url === "/flaky") {
        flakyCalls += 1;
        res.statusCode = flakyCalls === 1 ? 503 : 204;
      } else if (req.url === "/always-fail") {
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
      `TRUNCATE TABLE crm_data_lifecycle_redaction_receipts, crm_data_lifecycle_conversation_targets,
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
    assert(firstState.rows[0].next_attempt_at !== null, "retryable failure must have a next-attempt time");
    assert(firstState.rows[0].delivered_at === null, "failed delivery must not fabricate delivered timestamp");

    await pool.query(`UPDATE crm_outbox SET next_attempt_at = CURRENT_TIMESTAMP WHERE aggregate_id = $1`, [flaky.result.opportunityId]);
    const second = await runCrmOutboxRelayOnce({
      pool,
      targetUrl: `${baseUrl}/flaky`,
      limit: 1,
      allowInsecureLocalhost: true,
    });
    assert(second.length === 1 && second[0].status === "DELIVERED", "retry after transient failure must be able to deliver.");
    assert(flakyCalls === 2, "flaky target must observe exactly two attempts");
    assert(requestKeys[0] === requestKeys[1] && requestKeys[0].length === 64, "retries must carry the same deterministic idempotency key");

    const deliveredState = await pool.query<{ delivery_state: string; attempts: number; delivered_at: Date | null; claim_token: string | null }>(
      `SELECT delivery_state, attempts, delivered_at, claim_token::text FROM crm_outbox WHERE aggregate_id = $1`,
      [flaky.result.opportunityId],
    );
    assert(deliveredState.rows[0].delivery_state === "DELIVERED", "successful retry must persist DELIVERED state");
    assert(deliveredState.rows[0].attempts === 2, "successful retry must preserve cumulative attempts");
    assert(deliveredState.rows[0].delivered_at !== null, "successful retry must record delivered timestamp");
    assert(deliveredState.rows[0].claim_token === null, "successful delivery must release its claim");

    const deliveredPayload = payloads[1];
    assert(deliveredPayload.protocol === "NORAUTO_CRM_OUTBOX_DELIVERY_V1", "relay must identify its delivery protocol");
    assert(deliveredPayload.opportunity.opportunityId === flaky.result.opportunityId, "relay payload must reconstruct durable opportunity identity");
    assert(deliveredPayload.managerHandoff.handoffId === flaky.managerHandoff.handoffId, "relay payload must reconstruct exact durable handoff identity");
    assert(deliveredPayload.managerHandoff.authority.approveDeal === "NOT_AUTHORIZED", "relay must preserve no deal-approval authority");

    const concurrentA = await persistLead(adapter, "1002", "2026-09-09T04:22:00.000Z");
    const concurrentB = await persistLead(adapter, "1003", "2026-09-09T04:23:00.000Z", "Vehicle Sourcing");
    const [claimA, claimB] = await Promise.all([
      claimCrmOutboxBatch({ pool, limit: 1, leaseSeconds: 30 }),
      claimCrmOutboxBatch({ pool, limit: 1, leaseSeconds: 30 }),
    ]);
    assert(claimA.length === 1 && claimB.length === 1, "concurrent relay workers must each claim available work");
    assert(claimA[0].eventId !== claimB[0].eventId, "SKIP LOCKED claims must not hand the same event to two workers");
    const claimedAggregates = new Set([claimA[0].aggregateId, claimB[0].aggregateId]);
    assert(claimedAggregates.has(concurrentA.result.opportunityId) && claimedAggregates.has(concurrentB.result.opportunityId), "concurrent claims must cover both pending opportunities");
    const concurrentOutcomes = await Promise.all([
      deliverClaimedCrmOutboxEvent({ pool, event: claimA[0], targetUrl: `${baseUrl}/ok`, allowInsecureLocalhost: true }),
      deliverClaimedCrmOutboxEvent({ pool, event: claimB[0], targetUrl: `${baseUrl}/ok`, allowInsecureLocalhost: true }),
    ]);
    assert(concurrentOutcomes.every((outcome) => outcome.status === "DELIVERED"), "independent concurrent claims must both complete safely");

    const expired = await persistLead(adapter, "1004", "2026-09-09T04:24:00.000Z");
    await pool.query(
      `UPDATE crm_outbox
       SET delivery_state = 'PROCESSING', claim_token = gen_random_uuid(),
           claimed_at = CURRENT_TIMESTAMP - interval '2 minutes',
           claim_expires_at = CURRENT_TIMESTAMP - interval '1 minute'
       WHERE aggregate_id = $1`,
      [expired.result.opportunityId],
    );
    const recovered = await claimCrmOutboxBatch({ pool, limit: 1, leaseSeconds: 30 });
    assert(recovered.length === 1 && recovered[0].aggregateId === expired.result.opportunityId, "expired worker claim must become safely claimable again");
    assert(recovered[0].attempts === 1, "crash recovery must record a real new delivery attempt only when reclaimed");
    const recoveredOutcome = await deliverClaimedCrmOutboxEvent({ pool, event: recovered[0], targetUrl: `${baseUrl}/ok`, allowInsecureLocalhost: true });
    assert(recoveredOutcome.status === "DELIVERED", "recovered expired claim must still deliver normally");

    const parked = await persistLead(adapter, "1005", "2026-09-09T04:25:00.000Z");
    await pool.query(`UPDATE crm_outbox SET max_attempts = 1 WHERE aggregate_id = $1`, [parked.result.opportunityId]);
    const parkedOutcome = await runCrmOutboxRelayOnce({
      pool,
      targetUrl: `${baseUrl}/always-fail`,
      limit: 1,
      allowInsecureLocalhost: true,
    });
    assert(parkedOutcome.length === 1 && parkedOutcome[0].status === "PARKED", "max-attempt failure must park instead of retry forever");
    const parkedState = await pool.query<{ delivery_state: string; attempts: number; next_attempt_at: Date | null }>(
      `SELECT delivery_state, attempts, next_attempt_at FROM crm_outbox WHERE aggregate_id = $1`,
      [parked.result.opportunityId],
    );
    assert(parkedState.rows[0].delivery_state === "FAILED" && parkedState.rows[0].attempts === 1, "parked event must preserve terminal failed delivery state and attempt count");
    assert(parkedState.rows[0].next_attempt_at === null, "parked event must not remain automatically claimable");

    console.log("PASS_NODE_POSTGRES_HTTP_CRM_OUTBOX_RELAY");
  } finally {
    await pool.end();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

run();
