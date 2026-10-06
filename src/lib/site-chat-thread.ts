import { createHash, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

const SITE_CHAT_ACCESS_DAYS = 7;

export type SiteChatReply = {
  replyId: string;
  body: string;
  publishedAt: string;
  deliveryChannel: "NORAUTO_SITE_THREAD";
  authorityEffect: "NONE";
};

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function validToken(token: string) {
  return token.length >= 64 && token.length <= 160 && /^[A-Za-z0-9_-]+$/.test(token);
}

export async function registerSiteChatAccess(input: {
  pool: Pool;
  workspaceId: string;
  conversationId: string;
  accessToken: string;
  now?: Date;
}) {
  if (!validToken(input.accessToken)) throw new Error("SITE_CHAT_ACCESS_TOKEN_INVALID");
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("SITE_CHAT_ACCESS_TIME_INVALID");
  const expiresAt = new Date(now.getTime() + SITE_CHAT_ACCESS_DAYS * 24 * 60 * 60 * 1000);
  const hash = tokenHash(input.accessToken);

  const existing = await input.pool.query<{ access_token_hash: string; expires_at: Date | string }>(
    `select access_token_hash, expires_at
       from crm_site_chat_access
      where workspace_id=$1 and conversation_id=$2
      limit 1`,
    [input.workspaceId, input.conversationId],
  );

  if (existing.rowCount === 1) {
    const stored = existing.rows[0];
    if (!stored) throw new Error("SITE_CHAT_ACCESS_IDENTITY_DRIFT");
    const left = Buffer.from(stored.access_token_hash, "hex");
    const right = Buffer.from(hash, "hex");
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new Error("SITE_CHAT_ACCESS_IDENTITY_COLLISION");
    }
    return { status: "DEDUPLICATED" as const, expiresAt: new Date(stored.expires_at).toISOString() };
  }

  await input.pool.query(
    `insert into crm_site_chat_access (
       workspace_id, conversation_id, access_token_hash, created_at, expires_at
     ) values ($1,$2,$3,$4,$5)`,
    [input.workspaceId, input.conversationId, hash, now.toISOString(), expiresAt.toISOString()],
  );

  return { status: "COMMITTED" as const, expiresAt: expiresAt.toISOString() };
}

export async function readSiteChatReplies(input: {
  pool: Pool;
  workspaceId: string;
  conversationId: string;
  accessToken: string;
  now?: Date;
}): Promise<SiteChatReply[]> {
  if (!validToken(input.accessToken)) return [];
  const now = input.now ?? new Date();
  const hash = tokenHash(input.accessToken);

  const access = await input.pool.query<{ access_token_hash: string; expires_at: Date | string }>(
    `select access_token_hash, expires_at
       from crm_site_chat_access
      where workspace_id=$1 and conversation_id=$2
      limit 1`,
    [input.workspaceId, input.conversationId],
  );
  const row = access.rows[0];
  if (!row) return [];
  if (Date.parse(new Date(row.expires_at).toISOString()) <= now.getTime()) return [];

  const left = Buffer.from(row.access_token_hash, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return [];

  await input.pool.query(
    `update crm_site_chat_access
        set last_seen_at=$3
      where workspace_id=$1 and conversation_id=$2`,
    [input.workspaceId, input.conversationId, now.toISOString()],
  );

  const result = await input.pool.query<{
    reply_id: string;
    body: string;
    published_at: Date | string;
    delivery_channel: "NORAUTO_SITE_THREAD";
  }>(
    `select reply_id, body, published_at, delivery_channel
       from crm_site_chat_replies
      where workspace_id=$1
        and conversation_id=$2
        and delivery_state='PUBLISHED'
      order by published_at asc, reply_id asc
      limit 100`,
    [input.workspaceId, input.conversationId],
  );

  return result.rows.map((reply) => ({
    replyId: reply.reply_id,
    body: reply.body,
    publishedAt: new Date(reply.published_at).toISOString(),
    deliveryChannel: "NORAUTO_SITE_THREAD",
    authorityEffect: "NONE",
  }));
}

export async function publishSiteChatReply(input: {
  pool: Pool;
  workspaceId: string;
  provider: string;
  eventId: string;
  body: string;
  publishedBy: string;
}) {
  const body = input.body.trim();
  if (!body || body.length > 3000) throw new Error("SITE_CHAT_REPLY_BODY_INVALID");
  if (input.provider !== "NORAUTO_SITE_CHAT") throw new Error("SITE_CHAT_REPLY_PROVIDER_NOT_ELIGIBLE");

  const client = await input.pool.connect();
  try {
    await client.query("begin");

    const event = await client.query<{ conversation_id: string; processing_state: string }>(
      `select conversation_id, processing_state
         from crm_conversation_events
        where workspace_id=$1 and provider=$2 and event_id=$3
        limit 1`,
      [input.workspaceId, input.provider, input.eventId],
    );
    const row = event.rows[0];
    if (!row || row.processing_state === "DEAD_LETTER" || row.processing_state === "REDACTED") {
      throw new Error("SITE_CHAT_REPLY_EVENT_NOT_ELIGIBLE");
    }

    const ownership = await client.query<{
      assignment_state: "UNASSIGNED" | "ASSIGNED";
      assignee_subject_id: string | null;
    }>(
      `select assignment_state, assignee_subject_id
         from crm_conversation_assignments
        where workspace_id=$1 and provider=$2 and conversation_id=$3
        for update`,
      [input.workspaceId, input.provider, row.conversation_id],
    );
    const assignment = ownership.rows[0];
    if (
      !assignment ||
      assignment.assignment_state !== "ASSIGNED" ||
      assignment.assignee_subject_id !== input.publishedBy
    ) {
      throw new Error("SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED");
    }

    const access = await client.query<{ expires_at: Date | string }>(
      `select expires_at
         from crm_site_chat_access
        where workspace_id=$1 and conversation_id=$2
        for update`,
      [input.workspaceId, row.conversation_id],
    );
    const accessRow = access.rows[0];
    if (!accessRow || new Date(accessRow.expires_at).getTime() <= Date.now()) {
      throw new Error("SITE_CHAT_REPLY_THREAD_NOT_ACTIVE");
    }

    const inserted = await client.query<{ reply_id: string; published_at: Date | string }>(
      `insert into crm_site_chat_replies (
         workspace_id, conversation_id, source_event_id, body, published_by
       ) values ($1,$2,$3,$4,$5)
       returning reply_id, published_at`,
      [input.workspaceId, row.conversation_id, input.eventId, body, input.publishedBy],
    );
    const reply = inserted.rows[0];
    if (!reply) throw new Error("SITE_CHAT_REPLY_INSERT_FAILED");

    if (new Date(accessRow.expires_at).getTime() <= Date.now()) {
      throw new Error("SITE_CHAT_REPLY_THREAD_NOT_ACTIVE");
    }

    await client.query("commit");

    return {
      protocol: "NORAUTO_SITE_CHAT_PUBLISH_RECEIPT_V1" as const,
      conversationId: row.conversation_id,
      replyId: reply.reply_id,
      publishedAt: new Date(reply.published_at).toISOString(),
      deliveryChannel: "NORAUTO_SITE_THREAD" as const,
      externalDelivery: "NOT_PERFORMED" as const,
      authorityEffect: "NONE" as const,
    };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Site-chat reply transaction failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
