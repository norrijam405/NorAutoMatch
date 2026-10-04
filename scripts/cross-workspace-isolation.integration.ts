import assert from "node:assert/strict";
import { Pool } from "pg";
import { readPendingManagerQueue } from "../src/lib/crm-manager-queue";
import { executeManagerReviewCommand } from "../src/lib/crm-manager-review-command";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for cross-workspace isolation integration.");
const pool = new Pool({ connectionString });

const workspaceA = "workspace-a";
const workspaceB = "workspace-b";
const opportunityA = "namo_aaaaaaaaaaaaaaaaaaaaaaaa";
const opportunityB = "namo_bbbbbbbbbbbbbbbbbbbbbbbb";
const handoffA = "namh_aaaaaaaaaaaaaaaaaaaaaaaa";
const handoffB = "namh_bbbbbbbbbbbbbbbbbbbbbbbb";

async function insertFixture(input: {
  workspaceId: string;
  opportunityId: string;
  handoffId: string;
  intakeKey: string;
  handoffKey: string;
  customerLabel: string;
}) {
  await pool.query(
    `INSERT INTO crm_opportunities (
       opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
       customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
       created_at, updated_at
     ) VALUES ($1, $2, $3, 'Standard Retail', 'CONTACT_PENDING', 'MANAGER_REVIEW_PENDING',
       $4::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $5,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [input.opportunityId, input.workspaceId, input.intakeKey, JSON.stringify({ label: input.customerLabel }), input.handoffId],
  );
  await pool.query(
    `INSERT INTO crm_manager_handoffs (
       handoff_id, workspace_id, opportunity_id, handoff_idempotency_key,
       protocol, workflow_state, desk_prep, authority, created_at
     ) VALUES ($1, $2, $3, $4,
       'NORAUTO_MANAGER_HANDOFF_V1', 'MANAGER_REVIEW_PENDING', '{}'::jsonb,
       '{"approveDeal":"NOT_AUTHORIZED"}'::jsonb, CURRENT_TIMESTAMP)`,
    [input.handoffId, input.workspaceId, input.opportunityId, input.handoffKey],
  );
}

async function main() {
  await insertFixture({
    workspaceId: workspaceA,
    opportunityId: opportunityA,
    handoffId: handoffA,
    intakeKey: "a".repeat(64),
    handoffKey: "c".repeat(64),
    customerLabel: "A_ONLY",
  });
  await insertFixture({
    workspaceId: workspaceB,
    opportunityId: opportunityB,
    handoffId: handoffB,
    intakeKey: "b".repeat(64),
    handoffKey: "d".repeat(64),
    customerLabel: "B_ONLY",
  });

  const queueA = await readPendingManagerQueue({ pool, workspaceId: workspaceA, limit: 20 });
  const queueB = await readPendingManagerQueue({ pool, workspaceId: workspaceB, limit: 20 });
  assert.deepEqual(queueA.map((item) => item.opportunityId), [opportunityA], "workspace A queue must contain only workspace A data");
  assert.deepEqual(queueB.map((item) => item.opportunityId), [opportunityB], "workspace B queue must contain only workspace B data");
  assert.equal((queueA[0].customer as { label?: string }).label, "A_ONLY", "workspace A must not receive workspace B customer payload");
  assert.equal((queueB[0].customer as { label?: string }).label, "B_ONLY", "workspace B must not receive workspace A customer payload");

  await assert.rejects(
    () => executeManagerReviewCommand({
      pool,
      workspaceId: workspaceA,
      opportunityId: opportunityB,
      expectedHandoffId: handoffB,
      decision: "ACKNOWLEDGED",
      actor: {
        state: "VERIFIED",
        subjectId: "manager:workspace-a",
        verifier: "cross-workspace-integration",
        verifiedAt: new Date().toISOString(),
        evidenceRef: "manager-session:workspace-a",
      },
    }),
    /could not resolve the requested workspace opportunity/i,
    "workspace A manager command must not resolve or mutate a workspace B opportunity",
  );

  const bState = await pool.query<{ desk_state: string; latest_manager_receipt_id: string | null }>(
    `SELECT desk_state, latest_manager_receipt_id
     FROM crm_opportunities
     WHERE workspace_id = $1 AND opportunity_id = $2`,
    [workspaceB, opportunityB],
  );
  assert.equal(bState.rows[0].desk_state, "MANAGER_REVIEW_PENDING", "cross-workspace write attempt must not change workspace B desk state");
  assert.equal(bState.rows[0].latest_manager_receipt_id, null, "cross-workspace write attempt must not create a manager receipt reference");

  const bReceipts = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM crm_manager_review_receipts
     WHERE workspace_id = $1 AND opportunity_id = $2`,
    [workspaceB, opportunityB],
  );
  assert.equal(bReceipts.rows[0].count, "0", "cross-workspace write attempt must not create a workspace B receipt");

  console.log("PASS_CROSS_WORKSPACE_MANAGER_READ_WRITE_ISOLATION");
}

main().finally(() => pool.end());
