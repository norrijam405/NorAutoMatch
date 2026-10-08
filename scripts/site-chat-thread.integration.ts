import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
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

    const frc12ConversationId = "site-00000000-0000-4000-8000-000000000301";
    const frc12EventId = "site-00000000-0000-4000-8000-000000000302";
    const frc12Rep = "synthetic-rep-frc12";
    const frc12LegitimateToken = "legitimateCapability_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_abcdef";
    const frc12AttackerToken = "attackerPreseedToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_abcdef";
    const frc12AttackerHash = createHash("sha256").update(frc12AttackerToken, "utf8").digest("hex");

    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, frc12EventId, frc12ConversationId, JSON.stringify({ synthetic: true, frc12: true })],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
      [workspaceId, provider, frc12ConversationId, frc12Rep],
    );

    await pool.query(
      `insert into crm_site_chat_access (
        workspace_id, conversation_id, access_token_hash, issuance_proof, created_at, expires_at
      ) values ($1,$2,$3,$4,current_timestamp,clock_timestamp() + interval '7 days')`,
      [workspaceId, frc12ConversationId, frc12AttackerHash, "a".repeat(64)],
    );

    const frc12Registered = await registerSiteChatAccess({
      pool,
      workspaceId,
      conversationId: frc12ConversationId,
      accessToken: frc12LegitimateToken,
    });
    assert.equal(frc12Registered.status, "COMMITTED", "attacker pre-seeding must not block legitimate issuance");

    await publishSiteChatReply({
      pool,
      workspaceId,
      provider,
      eventId: frc12EventId,
      body: "FRC-12 legitimate reply",
      publishedBy: frc12Rep,
    });

    const frc12Rows = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_access
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, frc12ConversationId],
    );
    assert.equal(frc12Rows.rows[0]?.count, "2", "untrusted pre-seed may coexist but must carry no authority");

    assert.equal(
      (await readSiteChatReplies({
        pool,
        workspaceId,
        conversationId: frc12ConversationId,
        accessToken: frc12AttackerToken,
      })).length,
      0,
      "attacker pre-seeded token must remain unauthorized",
    );

    const frc12LegitimateReplies = await readSiteChatReplies({
      pool,
      workspaceId,
      conversationId: frc12ConversationId,
      accessToken: frc12LegitimateToken,
    });
    assert.equal(frc12LegitimateReplies.length, 1, "legitimate issuance must retain thread read authority");
    assert.equal(frc12LegitimateReplies[0]?.body, "FRC-12 legitimate reply");

    console.log("PASS FRC-12 pre-issuance attacker row is unauthenticated and does not block legitimate capability");

    const frc13ConversationId = "site-00000000-0000-4000-8000-000000000401";
    const frc13EventId = "site-00000000-0000-4000-8000-000000000402";
    const frc13Rep = "synthetic-rep-frc13";
    const frc13LegitimateToken = "frc13LegitimateToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_abcdef";

    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, frc13EventId, frc13ConversationId, JSON.stringify({ synthetic: true, frc13: true })],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
      [workspaceId, provider, frc13ConversationId, frc13Rep],
    );

    await pool.query(
      `insert into crm_site_chat_access (
        workspace_id, conversation_id, access_token_hash, issuance_proof, publication_proof, created_at, expires_at
      ) values ($1,$2,$3,null,null,current_timestamp,clock_timestamp() + interval '7 days')`,
      [workspaceId, frc13ConversationId, "c".repeat(64)],
    );

    await assert.rejects(
      publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId: frc13EventId,
        body: "FRC-13 unauthenticated app publication must fail",
        publishedBy: frc13Rep,
      }),
      /SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/,
      "application publication must reject an unauthenticated active access row",
    );

    await assert.rejects(
      pool.query(
        `insert into crm_site_chat_replies (
          workspace_id, conversation_id, source_event_id, body, published_by
        ) values ($1,$2,$3,$4,$5)`,
        [
          workspaceId,
          frc13ConversationId,
          frc13EventId,
          "FRC-13 direct SQL publication must fail",
          frc13Rep,
        ],
      ),
      /SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/,
      "deferred database guard must reject direct SQL publication without authenticated access",
    );

    await pool.query(
      `insert into crm_site_chat_access (
        workspace_id, conversation_id, access_token_hash, issuance_proof, publication_proof, created_at, expires_at
      ) values ($1,$2,$3,$4,$5,current_timestamp,clock_timestamp() + interval '7 days')`,
      [workspaceId, frc13ConversationId, "d".repeat(64), "e".repeat(64), "f".repeat(64)],
    );

    await assert.rejects(
      publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId: frc13EventId,
        body: "FRC-13 forged proof publication must fail",
        publishedBy: frc13Rep,
      }),
      /SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/,
      "application publication must reject forged proof-looking access rows",
    );

    const frc13Registered = await registerSiteChatAccess({
      pool,
      workspaceId,
      conversationId: frc13ConversationId,
      accessToken: frc13LegitimateToken,
    });
    assert.equal(frc13Registered.status, "COMMITTED");

    const frc13LegitimatePublish = await publishSiteChatReply({
      pool,
      workspaceId,
      provider,
      eventId: frc13EventId,
      body: "FRC-13 legitimate authenticated publication",
      publishedBy: frc13Rep,
    });
    assert.equal(frc13LegitimatePublish.deliveryChannel, "NORAUTO_SITE_THREAD");

    const frc13Count = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, frc13ConversationId],
    );
    assert.equal(frc13Count.rows[0]?.count, "1", "only authenticated publication may persist");

    console.log("PASS FRC-13 publication requires cryptographically authentic site-chat access");

    const frc14ConversationId = "site-00000000-0000-4000-8000-000000000501";
    const frc14EventId = "site-00000000-0000-4000-8000-000000000502";
    const frc14Rep = "synthetic-rep-frc14";
    const frc14AttackerSecret = "attacker-controlled-publication-secret-0123456789abcdef";
    const frc14AccessHash = "9".repeat(64);
    const frc14Material = [
      "norautomatch:site-chat-publication:v1",
      workspaceId,
      frc14ConversationId,
      frc14AccessHash,
    ].join("\u001f");
    const frc14ForgedProof = createHmac("sha256", frc14AttackerSecret)
      .update(frc14Material, "utf8")
      .digest("hex");

    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, frc14EventId, frc14ConversationId, JSON.stringify({ synthetic: true, frc14: true })],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
      [workspaceId, provider, frc14ConversationId, frc14Rep],
    );

    await assert.rejects(
      async () => {
        const frc14Client = await pool.connect();
        try {
          await frc14Client.query("begin");
          await frc14Client.query(
            `insert into crm_site_chat_access (
              workspace_id, conversation_id, access_token_hash, issuance_proof, publication_proof, created_at, expires_at
            ) values ($1,$2,$3,null,$4,current_timestamp,clock_timestamp() + interval '7 days')`,
            [workspaceId, frc14ConversationId, frc14AccessHash, frc14ForgedProof],
          );
          await frc14Client.query(
            "select set_config('norautomatch.site_chat_publication_hmac_secret', $1, true)",
            [frc14AttackerSecret],
          );
          await frc14Client.query(
            `insert into crm_site_chat_replies (
              workspace_id, conversation_id, source_event_id, body, published_by
            ) values ($1,$2,$3,$4,$5)`,
            [
              workspaceId,
              frc14ConversationId,
              frc14EventId,
              "FRC-14 self-asserted publication must fail",
              frc14Rep,
            ],
          );
          await frc14Client.query("commit");
        } catch (error) {
          try { await frc14Client.query("rollback"); } catch {}
          throw error;
        } finally {
          frc14Client.release();
        }
      },
      /SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/,
      "attacker-chosen transaction-local secret must not self-authenticate at deferred commit",
    );

    const frc14Count = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, frc14ConversationId],
    );
    assert.equal(frc14Count.rows[0]?.count, "0", "FRC-14 forged reply must roll back");

    console.log("PASS FRC-14 transaction-local HMAC secret must match immutable bootstrap trust anchor");

    const frc15ConversationId = "site-00000000-0000-4000-8000-000000000601";
    const frc15EventId = "site-00000000-0000-4000-8000-000000000602";
    const frc15Rep = "synthetic-rep-frc15";
    const frc15AttackerSecret = "attacker-temp-shadow-secret-0123456789abcdef012345";
    const frc15AccessHash = "8".repeat(64);
    const frc15Material = [
      "norautomatch:site-chat-publication:v1",
      workspaceId,
      frc15ConversationId,
      frc15AccessHash,
    ].join("\u001f");
    const frc15ForgedProof = createHmac("sha256", frc15AttackerSecret)
      .update(frc15Material, "utf8")
      .digest("hex");
    const frc15AttackerDigest = createHash("sha256")
      .update(frc15AttackerSecret, "utf8")
      .digest("hex");

    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, frc15EventId, frc15ConversationId, JSON.stringify({ synthetic: true, frc15: true })],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
      [workspaceId, provider, frc15ConversationId, frc15Rep],
    );

    await assert.rejects(
      async () => {
        const frc15Client = await pool.connect();
        try {
          await frc15Client.query("begin");
          await frc15Client.query(
            `create temporary table crm_site_chat_publication_secret_anchor (
              anchor_id text primary key,
              current_secret_sha256 char(64) not null,
              previous_secret_sha256 char(64)
            ) on commit drop`,
          );
          await frc15Client.query(
            `insert into crm_site_chat_publication_secret_anchor (
              anchor_id, current_secret_sha256, previous_secret_sha256
            ) values ('ACTIVE', $1, null)`,
            [frc15AttackerDigest],
          );
          await frc15Client.query("set local search_path = pg_temp, public");
          await frc15Client.query(
            `insert into public.crm_site_chat_access (
              workspace_id, conversation_id, access_token_hash, issuance_proof, publication_proof, created_at, expires_at
            ) values ($1,$2,$3,null,$4,current_timestamp,clock_timestamp() + interval '7 days')`,
            [workspaceId, frc15ConversationId, frc15AccessHash, frc15ForgedProof],
          );
          await frc15Client.query(
            "select set_config('norautomatch.site_chat_publication_hmac_secret', $1, true)",
            [frc15AttackerSecret],
          );
          await frc15Client.query(
            `insert into public.crm_site_chat_replies (
              workspace_id, conversation_id, source_event_id, body, published_by
            ) values ($1,$2,$3,$4,$5)`,
            [
              workspaceId,
              frc15ConversationId,
              frc15EventId,
              "FRC-15 temp anchor shadow publication must fail",
              frc15Rep,
            ],
          );
          await frc15Client.query("commit");
        } catch (error) {
          try { await frc15Client.query("rollback"); } catch {}
          throw error;
        } finally {
          frc15Client.release();
        }
      },
      /SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/,
      "temporary anchor shadow must not substitute for public trust anchor",
    );

    const frc15Count = await pool.query<{ count: string }>(
      `select count(*)::text as count
         from public.crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, frc15ConversationId],
    );
    assert.equal(frc15Count.rows[0]?.count, "0", "FRC-15 shadow-forged reply must roll back");

    console.log("PASS FRC-15 temporary relation shadow cannot replace schema-qualified trust anchor");

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

    const accessAfterRead = await pool.query<{ last_seen_at: Date | string | null; access_token_hash: string; expires_at: Date | string }>(
      `select last_seen_at, access_token_hash, expires_at
         from crm_site_chat_access
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, conversationId],
    );
    const accessSnapshot = accessAfterRead.rows[0];
    assert.ok(accessSnapshot?.last_seen_at, "legitimate thread read must still update last_seen_at");
    const originalAccessHash = accessSnapshot.access_token_hash;
    const originalExpiresAt = new Date(accessSnapshot.expires_at).toISOString();

    const attackerToken = "attackerCapabilityToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_abcd";
    const attackerHash = createHash("sha256").update(attackerToken, "utf8").digest("hex");

    await assert.rejects(
      pool.query(
        `update crm_site_chat_access
            set access_token_hash=$3
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId, attackerHash],
      ),
      /SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE/,
      "direct SQL must not rewrite the browser capability hash",
    );

    await assert.rejects(
      pool.query(
        `update crm_site_chat_access
            set expires_at=expires_at + interval '30 days'
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      ),
      /SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE/,
      "direct SQL must not extend site-thread capability expiry",
    );

    await assert.rejects(
      pool.query(
        `update crm_site_chat_access
            set workspace_id='forged-workspace'
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      ),
      /SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE/,
      "direct SQL must not reassign site-thread workspace identity",
    );

    await assert.rejects(
      pool.query(
        `update crm_site_chat_access
            set conversation_id='site-00000000-0000-4000-8000-999999999999'
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      ),
      /SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE/,
      "direct SQL must not reassign site-thread conversation identity",
    );

    await assert.rejects(
      pool.query(
        `delete from crm_site_chat_access
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, conversationId],
      ),
      /SITE_CHAT_ACCESS_CAPABILITY_DELETE_FORBIDDEN/,
      "direct SQL must not delete and replace an issued capability",
    );

    await assert.rejects(
      pool.query("truncate table crm_site_chat_access"),
      /SITE_CHAT_ACCESS_LEDGER_CANNOT_BE_TRUNCATED/,
      "site-thread access capability ledger must not be truncatable",
    );

    const accessAfterAttacks = await pool.query<{ access_token_hash: string; expires_at: Date | string }>(
      `select access_token_hash, expires_at
         from crm_site_chat_access
        where workspace_id=$1 and conversation_id=$2`,
      [workspaceId, conversationId],
    );
    assert.equal(accessAfterAttacks.rows[0]?.access_token_hash, originalAccessHash);
    assert.equal(new Date(accessAfterAttacks.rows[0]!.expires_at).toISOString(), originalExpiresAt);
    assert.equal(
      (await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: attackerToken })).length,
      0,
      "attacker-chosen token must remain unauthorized",
    );
    assert.equal(
      (await readSiteChatReplies({ pool, workspaceId, conversationId, accessToken: token })).length,
      1,
      "legitimate browser capability must remain authorized",
    );

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

    const currentOwnerReply = await pool.query<{ reply_id: string }>(
      `select reply_id
         from crm_site_chat_replies
        where workspace_id=$1
          and conversation_id=$2
          and body=$3
        limit 1`,
      [workspaceId, conversationId, "The current owner can publish."],
    );
    const currentOwnerReplyId = currentOwnerReply.rows[0]?.reply_id;
    assert.ok(currentOwnerReplyId);

    await assert.rejects(
      pool.query(
        `update crm_site_chat_replies
            set source_event_id='arbitrary-rewritten-source'
          where workspace_id=$1 and conversation_id=$2 and reply_id=$3::uuid`,
        [workspaceId, conversationId, currentOwnerReplyId],
      ),
      /SITE_CHAT_REPLY_PUBLISHED_EVIDENCE_IMMUTABLE/,
      "published reply source_event_id must be immutable",
    );

    await assert.rejects(
      pool.query(
        `update crm_site_chat_replies
            set published_by='forged-non-owner'
          where workspace_id=$1 and conversation_id=$2 and reply_id=$3::uuid`,
        [workspaceId, conversationId, currentOwnerReplyId],
      ),
      /SITE_CHAT_REPLY_PUBLISHED_EVIDENCE_IMMUTABLE/,
      "published reply publisher identity must be immutable",
    );

    await assert.rejects(
      pool.query(
        `update crm_site_chat_replies
            set body='forged rewritten content'
          where workspace_id=$1 and conversation_id=$2 and reply_id=$3::uuid`,
        [workspaceId, conversationId, currentOwnerReplyId],
      ),
      /SITE_CHAT_REPLY_PUBLISHED_EVIDENCE_IMMUTABLE/,
      "published reply body must be immutable",
    );

    await assert.rejects(
      pool.query(
        `delete from crm_site_chat_replies
          where workspace_id=$1 and conversation_id=$2 and reply_id=$3::uuid`,
        [workspaceId, conversationId, currentOwnerReplyId],
      ),
      /SITE_CHAT_REPLY_PUBLISHED_EVIDENCE_IMMUTABLE/,
      "published reply evidence must not be silently deleted",
    );

    await assert.rejects(
      pool.query("truncate table crm_site_chat_replies"),
      /SITE_CHAT_REPLY_LEDGER_CANNOT_BE_TRUNCATED/,
      "published reply evidence ledger must not be truncatable",
    );

    const preservedReply = await pool.query<{
      source_event_id: string;
      published_by: string;
      body: string;
    }>(
      `select source_event_id, published_by, body
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2 and reply_id=$3::uuid`,
      [workspaceId, conversationId, currentOwnerReplyId],
    );
    assert.equal(preservedReply.rows[0]?.source_event_id, eventId);
    assert.equal(preservedReply.rows[0]?.published_by, repB);
    assert.equal(preservedReply.rows[0]?.body, "The current owner can publish.");

    const expiryConversationId = "site-00000000-0000-4000-8000-000000000201";
    const expiryEventId = "site-00000000-0000-4000-8000-000000000202";
    const expiryToken = "expiryToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_abcdefghijklmnop";

    await pool.query(
      `insert into crm_conversation_events (
        workspace_id,provider,event_id,conversation_id,event_type,observed_at,
        normalized_payload,routing_decision,routing_reasons,processing_state
      ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,$5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, expiryEventId, expiryConversationId, JSON.stringify({ synthetic: true, expiryFixture: true })],
    );

    await pool.query(
      `insert into crm_conversation_assignments (
        workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
      ) values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
      [workspaceId, provider, expiryConversationId, repB],
    );

    const expiryIssuedAt = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000) + 1000);
    const expiryRegistration = await registerSiteChatAccess({
      pool,
      workspaceId,
      conversationId: expiryConversationId,
      accessToken: expiryToken,
      now: expiryIssuedAt,
    });
    assert.equal(expiryRegistration.status, "COMMITTED");

    const expiryLock = await pool.connect();
    try {
      await expiryLock.query("begin");
      await expiryLock.query(
        `select 1
           from crm_conversation_assignments
          where workspace_id=$1 and provider=$2 and conversation_id=$3
          for update`,
        [workspaceId, provider, expiryConversationId],
      );

      const expiredWhileWaiting = publishSiteChatReply({
        pool,
        workspaceId,
        provider,
        eventId: expiryEventId,
        body: "This reply must fail after access expires during the lock wait.",
        publishedBy: repB,
      });

      await delay(1500);

      const expiryProof = await pool.query<{ expired: boolean }>(
        `select expires_at <= clock_timestamp() as expired
           from crm_site_chat_access
          where workspace_id=$1 and conversation_id=$2`,
        [workspaceId, expiryConversationId],
      );
      assert.equal(expiryProof.rows[0]?.expired, true, "site-thread access must be expired before releasing ownership lock");

      await expiryLock.query("commit");

      await assert.rejects(
        expiredWhileWaiting,
        /SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/,
        "publication must re-evaluate authenticated access expiry after waiting for ownership lock",
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
      [workspaceId, expiryConversationId],
    );
    assert.equal(replyCountAfterExpiry.rows[0]?.count, "0", "expired access must not insert a reply after lock wait");

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
