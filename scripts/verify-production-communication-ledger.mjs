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
  ]) {
    const result = await client.query("select to_regclass($1) as relation", [relation]);
    if (!result.rows[0]?.relation) throw new Error(`PRODUCTION_RELATION_MISSING:${relation}`);
  }

  for (const triggerName of [
    "crm_conversation_contact_events_insert_truth",
    "crm_conversation_contact_events_immutable",
    "crm_conversation_contact_events_no_truncate",
  ]) {
    const trigger = await client.query(
      "select 1 from pg_trigger where tgname = $1 and not tgisinternal",
      [triggerName],
    );
    if (trigger.rowCount !== 1) throw new Error(`PRODUCTION_TRIGGER_MISSING:${triggerName}`);
  }

  console.log("PASS production startup installed ownership + communication ledger truth guards");
} finally {
  await client.end();
}
