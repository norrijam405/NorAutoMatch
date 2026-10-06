import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { publishSiteChatReply } from "../src/lib/site-chat-thread";

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

  const pool = createPostgresCrmPool(connectionString);
  const workspaceId = "norautomatch-frc03";
  const provider = "NORAUTO_SITE_CHAT";
  const conversationId = "site-frc03-0000-4000-8000-000000000001";
  const eventId = "site-frc03-0000-4000-8000-000000000002";
  const rep = "synthetic-current-owner";

  try {
    await pool.query("delete from crm_site_chat_replies where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_site_chat_access where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_assignments where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_events where workspace_id=$1 and provider=$2", [workspaceId, provider]);

    await pool.query(
      `insert into crm_conversation_events (
         workspace_id,provider,event_id,conversation_id,event_type,observed_at,
         normalized_payload,routing_decision,routing_reasons,processing_state
       ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),
                 '{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, eventId, conversationId],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
         workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
       ) values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())`,
      [workspaceId, provider, conversationId, rep],
    );

    await pool.query(
      `insert into crm_site_chat_access (
         workspace_id,conversation_id,access_token_hash,created_at,expires_at
       ) values ($1,$2,repeat('a',64),clock_timestamp(),clock_timestamp()+interval '10 minutes')`,
      [workspaceId, conversationId],
    );

    const insertBlocker = await pool.connect();
    try {
      await insertBlocker.query("begin");
      await insertBlocker.query("lock table crm_site_chat_replies in access exclusive mode");

      const publication = publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId,
        body: "Publication should serialize ahead of later revocation.",
        publishedBy: rep,
      });

      await delay(150);

      let revocationFinished = false;
      const revoke = pool.query(
        `delete from crm_site_chat_access
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      ).then((result) => {
        revocationFinished = true;
        return result;
      });

      await delay(150);
      assert.equal(revocationFinished, false, "revocation must block behind publication access-row lock");

      await insertBlocker.query("commit");

      const receipt = await publication;
      assert.equal(receipt.deliveryChannel, "NORAUTO_SITE_THREAD");

      const revoked = await revoke;
      assert.equal(revoked.rowCount, 1, "revocation should complete only after publication commits");

      const replyCount = await pool.query<{ count: string }>(
        `select count(*)::text as count
           from crm_site_chat_replies
          where workspace_id=$1 and conversation_id=$2 and delivery_state='PUBLISHED'`,
        [workspaceId, conversationId],
      );
      assert.equal(replyCount.rows[0]?.count, "1");

      const accessCount = await pool.query<{ count: string }>(
        `select count(*)::text as count
           from crm_site_chat_access
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      );
      assert.equal(accessCount.rows[0]?.count, "0");
    } catch (error) {
      try { await insertBlocker.query("rollback"); } catch {}
      throw error;
    } finally {
      insertBlocker.release();
    }

    console.log("PASS FRC-03 access-row lock serializes revocation through publication commit");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
