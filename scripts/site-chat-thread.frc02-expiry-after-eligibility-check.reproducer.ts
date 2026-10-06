import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { publishSiteChatReply } from "../src/lib/site-chat-thread";

/**
 * Fresh Re-Challenger executable specification for:
 * NORAUTOMATCH-R2-FC01-FRC-02
 *
 * This branch is rooted at exact candidate a3311dac4891efdada833e5fc06d7c42ff7898fd.
 * It changes test/evidence material only.
 *
 * Purpose:
 * Prove that site-thread access can pass the post-ownership-lock eligibility SELECT,
 * then expire while the subsequent reply INSERT is blocked, and still commit because
 * publishSiteChatReply() performs no expiry re-check at INSERT/COMMIT time.
 */
async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

  const pool = createPostgresCrmPool(connectionString);
  const workspaceId = "norautomatch-frc02";
  const provider = "NORAUTO_SITE_CHAT";
  const conversationId = "site-frc02-0000-4000-8000-000000000001";
  const eventId = "site-frc02-0000-4000-8000-000000000002";
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
       ) values ($1,$2,repeat('a',64),clock_timestamp(),clock_timestamp()+interval '1 second')`,
      [workspaceId, conversationId],
    );

    const insertBlocker = await pool.connect();
    try {
      await insertBlocker.query("begin");
      await insertBlocker.query("lock table crm_site_chat_replies in access exclusive mode");

      const publish = publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId,
        body: "This reply must not commit after thread access expires.",
        publishedBy: rep,
      });

      // The candidate can pass event, ownership and access checks while the INSERT
      // waits on the reply-table lock held above.
      await delay(1500);

      const expiry = await pool.query<{ expired: boolean }>(
        `select expires_at <= clock_timestamp() as expired
           from crm_site_chat_access
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      );
      assert.equal(expiry.rows[0]?.expired, true, "access must be expired before INSERT can proceed");

      await insertBlocker.query("commit");

      await assert.rejects(
        publish,
        /SITE_CHAT_REPLY_THREAD_NOT_ACTIVE/,
        "publication must fail if access expires after eligibility check but before reply commit",
      );
    } catch (error) {
      try { await insertBlocker.query("rollback"); } catch {}
      throw error;
    } finally {
      insertBlocker.release();
    }

    const count = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2 and delivery_state='PUBLISHED'`,
      [workspaceId, conversationId],
    );
    assert.equal(count.rows[0]?.count, "0", "expired access must leave no inserted reply");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
