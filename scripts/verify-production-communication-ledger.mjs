import { createHash } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const client = new Client({ connectionString });
await client.connect();

try {
  const requiredMigrations = [
    "infrastructure/norautomatch-conversation-ownership-r0.sql",
    "infrastructure/norautomatch-conversation-communication-ledger-r0.sql",
    "infrastructure/norautomatch-site-chat-thread-r0.sql",
    "infrastructure/norautomatch-site-chat-access-integrity-r1.sql",
    "infrastructure/norautomatch-site-chat-access-authenticity-r2.sql",
    "infrastructure/norautomatch-site-chat-publication-authenticity-r3.sql",
    "infrastructure/norautomatch-site-chat-publication-secret-anchor-r4.sql",
  ];

  for (const migrationName of requiredMigrations) {
    const migration = await client.query(
      "select 1 from norautomatch_schema_migrations where migration_name = $1",
      [migrationName],
    );
    if (migration.rowCount !== 1) {
      throw new Error(`PRODUCTION_MIGRATION_NOT_RECORDED:${migrationName}`);
    }
  }

  for (const relation of [
    "public.crm_conversation_assignments",
    "public.crm_conversation_contact_events",
    "public.crm_site_chat_access",
    "public.crm_site_chat_replies",
    "public.crm_site_chat_publication_secret_anchor",
  ]) {
    const result = await client.query("select to_regclass($1) as relation", [relation]);
    if (!result.rows[0]?.relation) throw new Error(`PRODUCTION_RELATION_MISSING:${relation}`);
  }

  for (const triggerName of [
    "crm_conversation_contact_events_insert_truth",
    "crm_conversation_contact_events_immutable",
    "crm_conversation_contact_events_no_truncate",
    "crm_site_chat_reply_access_commit_guard",
    "crm_site_chat_reply_insert_truth_guard",
    "crm_site_chat_replies_immutable",
    "crm_site_chat_replies_no_truncate",
    "crm_site_chat_access_update_integrity",
    "crm_site_chat_access_no_delete",
    "crm_site_chat_access_no_truncate",
    "crm_site_chat_publication_anchor_immutable",
    "crm_site_chat_publication_anchor_no_truncate",
  ]) {
    const trigger = await client.query(
      "select 1 from pg_trigger where tgname = $1 and not tgisinternal",
      [triggerName],
    );
    if (trigger.rowCount !== 1) throw new Error(`PRODUCTION_TRIGGER_MISSING:${triggerName}`);
  }

  for (const functionName of [
    "norauto_enforce_site_chat_reply_access_at_commit",
    "norauto_enforce_site_chat_reply_insert_truth",
    "norauto_reject_site_chat_reply_mutation",
    "norauto_reject_site_chat_reply_truncate",
    "norauto_enforce_site_chat_access_update_integrity",
    "norauto_reject_site_chat_access_delete",
    "norauto_reject_site_chat_access_truncate",
    "norauto_site_chat_publication_proof_valid",
    "norauto_site_chat_publication_secret_trusted",
    "norauto_reject_site_chat_publication_anchor_mutation",
    "norauto_reject_site_chat_publication_anchor_truncate",
  ]) {
    const functionCheck = await client.query(
      "select 1 from pg_proc where proname = $1",
      [functionName],
    );
    if (functionCheck.rowCount !== 1) throw new Error(`PRODUCTION_FUNCTION_MISSING:${functionName}`);
  }

  const proofColumn = await client.query(
    `select 1
       from information_schema.columns
      where table_schema='public'
        and table_name='crm_site_chat_access'
        and column_name='issuance_proof'`,
  );
  if (proofColumn.rowCount !== 1) throw new Error("PRODUCTION_SITE_CHAT_ISSUANCE_PROOF_COLUMN_MISSING");

  const publicationProofColumn = await client.query(
    `select 1
       from information_schema.columns
      where table_schema='public'
        and table_name='crm_site_chat_access'
        and column_name='publication_proof'`,
  );
  if (publicationProofColumn.rowCount !== 1) throw new Error("PRODUCTION_SITE_CHAT_PUBLICATION_PROOF_COLUMN_MISSING");

  const pgcrypto = await client.query(
    "select 1 from pg_extension where extname='pgcrypto'",
  );
  if (pgcrypto.rowCount !== 1) throw new Error("PRODUCTION_PGCRYPTO_EXTENSION_MISSING");

  const configuredSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
  if (configuredSecret.length < 32) {
    throw new Error("PRODUCTION_SITE_CHAT_PUBLICATION_SECRET_NOT_CONFIGURED");
  }
  const configuredPrevious = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim() ?? "";

  const anchorRow = await client.query(
    `select current_secret_sha256, previous_secret_sha256
       from crm_site_chat_publication_secret_anchor
      where anchor_id='ACTIVE'`,
  );
  if (anchorRow.rowCount !== 1) throw new Error("PRODUCTION_SITE_CHAT_PUBLICATION_TRUST_ANCHOR_MISSING");

  const expectedCurrent = createHash("sha256").update(configuredSecret, "utf8").digest("hex");
  const expectedPrevious = configuredPrevious
    ? createHash("sha256").update(configuredPrevious, "utf8").digest("hex")
    : null;

  if (anchorRow.rows[0]?.current_secret_sha256?.trim() !== expectedCurrent) {
    throw new Error("PRODUCTION_SITE_CHAT_PUBLICATION_TRUST_ANCHOR_CURRENT_MISMATCH");
  }
  const recordedPrevious = anchorRow.rows[0]?.previous_secret_sha256?.trim() ?? null;
  if (recordedPrevious !== expectedPrevious) {
    throw new Error("PRODUCTION_SITE_CHAT_PUBLICATION_TRUST_ANCHOR_PREVIOUS_MISMATCH");
  }

  const primaryKey = await client.query(
    `select array_agg(a.attname order by u.ordinality)::text[] as columns
       from pg_constraint c
       join lateral unnest(c.conkey) with ordinality as u(attnum, ordinality) on true
       join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum
      where c.conrelid='crm_site_chat_access'::regclass
        and c.contype='p'
      group by c.oid`,
  );
  const pkColumns = primaryKey.rows[0]?.columns ?? [];
  if (pkColumns.join(",") !== "workspace_id,conversation_id,access_token_hash") {
    throw new Error(`PRODUCTION_SITE_CHAT_ACCESS_PRIMARY_KEY_DRIFT:${pkColumns.join(",")}`);
  }

  console.log("PASS production startup installed ownership + communication ledger + site-chat read/publication authenticity + immutable secret anchor");
} finally {
  await client.end();
}
