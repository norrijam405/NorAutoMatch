import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { registerSiteChatAccess, readSiteChatReplies, publishSiteChatReply } from "../src/lib/site-chat-thread";

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

  const pool = createPostgresCrmPool(connectionString);
  const workspaceId = "norautomatch";
  const provider = "NORAUTO_SITE_CHAT";
  const conversationId = "site-00000000-0000-4000-8000-000000000001";
  const eventId = "site-00000000-0000-4000-8000-000000000002";
  const token = "abcdefghijklmnopqrstuvwxABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-abcd";
  const repA = "synthetic-rep-a";
  const repB = "synthetic-rep-b";

  try {
    await pool.query("delete from crm_site_chat_replies where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_site_chat_access where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_assignment_events where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_assignments where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_events where workspace_id=$1 and provider=$2", [workspaceId, provider]);

    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, eventId, conversationId, JSON.stringify({ synthetic: true })],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
      [workspaceId, provider, conversationId, repA],
    );

    const registered = await registerSiteChatAccess({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(registered.status, "COMMITTED");

    await assert.rejects(
      pool.query(
        `insert into crm_site_chat_replies (
          workspace_id, conversation_id, source_event_id, body, published_by
        ) values ($1,$2,$3,$4,$5)`,
        [workspaceId, conversationId, "arbitrary-missing-event", "forged missing-event reply", repA],
      ),
      /SITE_CHAT_REPLY_EVENT_NOT_ELIGIBLE/,
      "direct SQL must not publish against an arbitrary source event",
    );

    const deadLetterEventId = "site-00000000-0000-4000-8000-000000000099";
    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'DEAD_LETTER')`,
      [workspaceId, provider, deadLetterEventId, conversationId, JSON.stringify({ synthetic: true })],
    );

    await assert.rejects(
      pool.query(
        `insert into crm_site_chat_replies (
          workspace_id, conversation_id, source_event_id, body, published_by
        ) values ($1,$2,$3,$4,$5)`,
        [workspaceId, conversationId, deadLetterEventId, "forged dead-letter reply", repA],
      ),
      /SITE_CHAT_REPLY_EVENT_NOT_ELIGIBLE/,
      "direct SQL must not publish from a DEAD_LETTER source event",
    );

    await assert.rejects(
      pool.query(
        `insert into crm_site_chat_replies (
          workspace_id, conversation_id, source_event_id, body, published_by
        ) values ($1,$2,$3,$4,$5)`,
        [workspaceId, conversationId, eventId, "forged non-owner reply", repB],
      ),
      /SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED/,
      "direct SQL must not publish as a non-owner",
    );

    const forgedCount = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, conversationId],
    );
    assert.equal(forgedCount.rows[0]?.count, "0", "forged direct-SQL replies must not persist");

    const replay = await registerSiteChatAccess({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(replay.status, "DEDUPLICATED");

    await assert.rejects(
      registerSiteChatAccess({
        pool,
        workspaceId,
        conversationId,
        accessToken: "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
      }),
      /SITE_CHAT_ACCESS_IDENTITY_COLLISION/,
    );

    const publish = await publishSiteChatReply({
      pool,
      workspaceId,
      provider,
      eventId,
      body: "A human-reviewed same-site reply.",
      publishedBy: repA,
    });
    assert.equal(publish.deliveryChannel, "NORAUTO_SITE_THREAD");
    assert.equal(publish.externalDelivery, "NOT_PERFORMED");

    assert.equal((await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: "wrong".repeat(20) })).length, 0);

    let replies = await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(replies.length, 1);
    assert.equal(replies[0]?.body, "A human-reviewed same-site reply.");
    assert.equal(replies[0]?.authorityEffect, "NONE");

    const transfer = await pool.connect();
    try {
      await transfer.query("begin");
      const moved = await transfer.query(
        `update crm_conversation_assignments
            set assignee_subject_id=$4, assignment_state='ASSIGNED',
                assigned_at=current_timestamp, updated_at=current_timestamp
          where workspace_id=$1 and provider=$2 and conversation_id=$3
            and assignee_subject_id=$5 and assignment_state='ASSIGNED'`,
        [workspaceId, provider, conversationId, repB, repA],
      );
      assert.equal(moved.rowCount, 1);

      const stalePublish = publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId,
        body: "This stale-owner reply must never commit.",
        publishedBy: repA,
      });

      await delay(100);
      await transfer.query("commit");

      await assert.rejects(stalePublish, /SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED/);
    } catch (error) {
      try { await transfer.query("rollback"); } catch {}
      throw error;
    } finally {
      transfer.release();
    }

    replies = await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(replies.length, 1, "stale owner must not insert a reply after ownership transfer");

    const currentOwnerPublish = await publishSiteChatReply({
      pool,
      workspaceId,
      provider,
      eventId,
      body: "The current owner can publish.",
      publishedBy: repB,
    });
    assert.equal(currentOwnerPublish.deliveryChannel, "NORAUTO_SITE_THREAD");

    replies = await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(replies.length, 2);
    assert.equal(replies[1]?.body, "The current owner can publish.");

    await pool.query(
      `update crm_site_chat_access
          set expires_at = clock_timestamp() + interval '1 second'
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, conversationId],
    );

    const expiryLock = await pool.connect();
    try {
      await expiryLock.query("begin");
      await expiryLock.query(
        `select 1
           from crm_conversation_assignments
          where workspace_id=$1 and provider=$2 and conversation_id=$3
          for update`,
        [workspaceId, provider, conversationId],
      );

      const expiredWhileWaiting = publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId,
        body: "This reply must fail after access expires during the lock wait.",
        publishedBy: repB,
      });

      await delay(1500);

      const expiryProof = await pool.query<{ expired: boolean }>(
        `select expires_at <= clock_timestamp() as expired
           from crm_site_chat_access
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      );
      assert.equal(expiryProof.rows[0]?.expired, true, "site-thread access must be expired before releasing ownership lock");

      await expiryLock.query("commit");

      await assert.rejects(
        expiredWhileWaiting,
        /SITE_CHAT_REPLY_THREAD_NOT_ACTIVE/,
        "publication must re-evaluate expiry at mutation time after waiting for ownership lock",
      );
    } catch (error) {
      try { await expiryLock.query("rollback"); } catch {}
      throw error;
    } finally {
      expiryLock.release();
    }

    const replyCountAfterExpiry = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2 and delivery_state='PUBLISHED'`,
      [workspaceId, conversationId],
    );
    assert.equal(replyCountAfterExpiry.rows[0]?.count, "2", "expired access must not insert a reply after lock wait");

    await assert.rejects(
      publishSiteChatReply({
        pool,
        workspaceId,
        provider: "RIDEMOTIVE_CHAT",
        eventId,
        body: "must not publish",
        publishedBy: repB,
      }),
      /SITE_CHAT_REPLY_PROVIDER_NOT_ELIGIBLE/,
    );

    console.log("PASS same-site Ask Torque reply transport + ownership race gate + mutation-time expiry gate");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
