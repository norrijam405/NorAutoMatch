import assert from "node:assert/strict";
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
  
  try {
    await pool.query("delete from crm_site_chat_replies where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_site_chat_access where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_events where workspace_id=$1 and provider=$2", [workspaceId, provider]);
  
    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, eventId, conversationId, JSON.stringify({ synthetic: true })],
    );
  
    const registered = await registerSiteChatAccess({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(registered.status, "COMMITTED");
  
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
      publishedBy: "synthetic-manager",
    });
    assert.equal(publish.deliveryChannel, "NORAUTO_SITE_THREAD");
    assert.equal(publish.externalDelivery, "NOT_PERFORMED");
  
    assert.equal((await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: "wrong".repeat(20) })).length, 0);
  
    const replies = await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: token });
    assert.equal(replies.length, 1);
    assert.equal(replies[0]?.body, "A human-reviewed same-site reply.");
    assert.equal(replies[0]?.authorityEffect, "NONE");
  
    await assert.rejects(
      publishSiteChatReply({
        pool,
        workspaceId,
        provider: "RIDEMOTIVE_CHAT",
        eventId,
        body: "must not publish",
        publishedBy: "synthetic-manager",
      }),
      /SITE_CHAT_REPLY_PROVIDER_NOT_ELIGIBLE/,
    );
  
    console.log("PASS same-site Ask Torque reply transport");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
