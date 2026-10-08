import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

const SITE_CHAT_ACCESS_DAYS = 7;
const DEVELOPMENT_SITE_CHAT_HMAC_SECRET = "development-only-norautomatch-site-chat-access-v2";

export type SiteChatReply = {
  replyId: string;
  body: string;
  publishedAt: string;
  deliveryChannel: "NORAUTO_SITE_THREAD";
  authorityEffect: "NONE";
};

type SiteChatAccessRow = {
  access_token_hash: string;
  issuance_proof: string | null;
  publication_proof?: string | null;
  created_at: Date | string;
  expires_at: Date | string;
  last_seen_at?: Date | string | null;
};

function validToken(token: string) {
  return token.length >= 64 && token.length <= 160 && /^[A-Za-z0-9_-]+$/.test(token);
}

function normalizeSecret(value: string | undefined, label: string) {
  const normalized = value?.trim() ?? "";
  if (!normalized || normalized.length < 32) throw new Error(`${label}_NOT_CONFIGURED`);
  return normalized;
}

function siteChatSecrets() {
  const currentRaw = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim();
  const previousRaw = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim();

  const current = currentRaw
    ? normalizeSecret(currentRaw, "SITE_CHAT_ACCESS_HMAC_SECRET")
    : process.env.NODE_ENV === "production"
      ? normalizeSecret(undefined, "SITE_CHAT_ACCESS_HMAC_SECRET")
      : DEVELOPMENT_SITE_CHAT_HMAC_SECRET;

  const previous = previousRaw
    ? normalizeSecret(previousRaw, "SITE_CHAT_ACCESS_PREVIOUS_HMAC_SECRET")
    : undefined;

  if (previous && previous === current) throw new Error("SITE_CHAT_ACCESS_HMAC_SECRET_ROTATION_INVALID");
  return { current, previous };
}

function hmacHex(secret: string, purpose: string, values: string[]) {
  return createHmac("sha256", secret)
    .update(JSON.stringify([purpose, ...values]), "utf8")
    .digest("hex");
}

function tokenHash(workspaceId: string, conversationId: string, token: string, secret: string) {
  return hmacHex(secret, "norautomatch:site-chat-access-token:v2", [workspaceId, conversationId, token]);
}

function issuanceProof(input: {
  workspaceId: string;
  conversationId: string;
  accessTokenHash: string;
  createdAt: string;
  expiresAt: string;
}, secret: string) {
  return hmacHex(secret, "norautomatch:site-chat-access-issuance:v2", [
    input.workspaceId,
    input.conversationId,
    input.accessTokenHash,
    input.createdAt,
    input.expiresAt,
  ]);
}

function publicationProof(workspaceId: string, conversationId: string, accessTokenHash: string, secret: string) {
  return createHmac("sha256", secret)
    .update([
      "norautomatch:site-chat-publication:v1",
      workspaceId,
      conversationId,
      accessTokenHash,
    ].join("\u001f"), "utf8")
    .digest("hex");
}

function validPublicationProof(
  row: SiteChatAccessRow,
  workspaceId: string,
  conversationId: string,
  secrets: { current: string; previous?: string },
) {
  if (!row.publication_proof || !/^[0-9a-f]{64}$/.test(row.publication_proof)) return false;
  const candidates = [secrets.current, secrets.previous].filter((value): value is string => Boolean(value));
  return candidates.some((secret) => equalHex(
    row.publication_proof!,
    publicationProof(workspaceId, conversationId, row.access_token_hash, secret),
  ));
}

function equalHex(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue, "hex");
  const right = Buffer.from(rightValue, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function validIssuanceProof(
  row: SiteChatAccessRow,
  workspaceId: string,
  conversationId: string,
  secrets: { current: string; previous?: string },
) {
  if (!row.issuance_proof || !/^[0-9a-f]{64}$/.test(row.issuance_proof)) return false;
  const createdAt = new Date(row.created_at).toISOString();
  const expiresAt = new Date(row.expires_at).toISOString();
  const candidates = [secrets.current, secrets.previous].filter((value): value is string => Boolean(value));

  return candidates.some((secret) => equalHex(
    row.issuance_proof!,
    issuanceProof({
      workspaceId,
      conversationId,
      accessTokenHash: row.access_token_hash,
      createdAt,
      expiresAt,
    }, secret),
  ));
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

  const secrets = siteChatSecrets();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SITE_CHAT_ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const currentHash = tokenHash(input.workspaceId, input.conversationId, input.accessToken, secrets.current);
  const tokenHashes = [
    currentHash,
    secrets.previous ? tokenHash(input.workspaceId, input.conversationId, input.accessToken, secrets.previous) : null,
  ].filter((value): value is string => Boolean(value));

  const client = await input.pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`norautomatch:site-chat-access:${input.workspaceId}:${input.conversationId}`],
    );

    const existing = await client.query<SiteChatAccessRow>(
      `select access_token_hash, issuance_proof, publication_proof, created_at, expires_at, last_seen_at
         from crm_site_chat_access
        where workspace_id=$1 and conversation_id=$2
        for update`,
      [input.workspaceId, input.conversationId],
    );

    const authenticRows = existing.rows.filter((row) =>
      validIssuanceProof(row, input.workspaceId, input.conversationId, secrets),
    );

    const sameToken = authenticRows.find((row) =>
      tokenHashes.some((hash) => equalHex(row.access_token_hash, hash)),
    );

    if (sameToken) {
      await client.query("commit");
      return {
        status: "DEDUPLICATED" as const,
        expiresAt: new Date(sameToken.expires_at).toISOString(),
      };
    }

    if (authenticRows.length > 0) {
      throw new Error("SITE_CHAT_ACCESS_IDENTITY_COLLISION");
    }

    const proof = issuanceProof({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      accessTokenHash: currentHash,
      createdAt,
      expiresAt,
    }, secrets.current);
    const publishProof = publicationProof(
      input.workspaceId,
      input.conversationId,
      currentHash,
      secrets.current,
    );

    await client.query(
      `insert into crm_site_chat_access (
         workspace_id, conversation_id, access_token_hash, issuance_proof, publication_proof, created_at, expires_at
       ) values ($1,$2,$3,$4,$5,$6,$7)`,
      [input.workspaceId, input.conversationId, currentHash, proof, publishProof, createdAt, expiresAt],
    );

    await client.query("commit");
    return { status: "COMMITTED" as const, expiresAt };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Site-chat access issuance failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
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
  const secrets = siteChatSecrets();
  const hashes = [
    tokenHash(input.workspaceId, input.conversationId, input.accessToken, secrets.current),
    secrets.previous ? tokenHash(input.workspaceId, input.conversationId, input.accessToken, secrets.previous) : null,
  ].filter((value): value is string => Boolean(value));

  const access = await input.pool.query<SiteChatAccessRow>(
    `select access_token_hash, issuance_proof, publication_proof, created_at, expires_at, last_seen_at
       from crm_site_chat_access
      where workspace_id=$1
        and conversation_id=$2
        and access_token_hash = any($3::text[])
      order by expires_at desc`,
    [input.workspaceId, input.conversationId, hashes],
  );

  const row = access.rows.find((candidate) =>
    validIssuanceProof(candidate, input.workspaceId, input.conversationId, secrets)
    && new Date(candidate.expires_at).getTime() > now.getTime(),
  );
  if (!row) return [];

  await input.pool.query(
    `update crm_site_chat_access
        set last_seen_at=greatest(coalesce(last_seen_at,$4::timestamptz),$4::timestamptz)
      where workspace_id=$1
        and conversation_id=$2
        and access_token_hash=$3`,
    [input.workspaceId, input.conversationId, row.access_token_hash, now.toISOString()],
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

    const secrets = siteChatSecrets();
    const access = await client.query<SiteChatAccessRow>(
      `select access_token_hash, issuance_proof, publication_proof, created_at, expires_at, last_seen_at
         from crm_site_chat_access
        where workspace_id=$1
          and conversation_id=$2
          and expires_at > clock_timestamp()
        order by expires_at desc
        for update`,
      [input.workspaceId, row.conversation_id],
    );
    const authenticAccess = access.rows.find((candidate) =>
      validIssuanceProof(candidate, input.workspaceId, row.conversation_id, secrets)
      && validPublicationProof(candidate, input.workspaceId, row.conversation_id, secrets),
    );
    if (!authenticAccess) {
      throw new Error("SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED");
    }

    await client.query(
      "select set_config('norautomatch.site_chat_publication_hmac_secret', $1, true)",
      [secrets.current],
    );
    await client.query(
      "select set_config('norautomatch.site_chat_publication_previous_hmac_secret', $1, true)",
      [secrets.previous ?? ""],
    );

    const inserted = await client.query<{ reply_id: string; published_at: Date | string }>(
      `insert into crm_site_chat_replies (
         workspace_id, conversation_id, source_event_id, body, published_by
       ) values ($1,$2,$3,$4,$5)
       returning reply_id, published_at`,
      [input.workspaceId, row.conversation_id, input.eventId, body, input.publishedBy],
    );
    const reply = inserted.rows[0];
    if (!reply) throw new Error("SITE_CHAT_REPLY_INSERT_FAILED");

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
