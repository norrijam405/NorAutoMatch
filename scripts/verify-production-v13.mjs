import pg from "pg";

const { Client } = pg;
const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const client = new Client({ connectionString });
await client.connect();

try {
  const migration = await client.query(
    "select 1 from norautomatch_schema_migrations where migration_name = $1",
    ["infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql"],
  );
  if (migration.rowCount !== 1) throw new Error("V13_MIGRATION_NOT_RECORDED");

  const table = await client.query(
    "select to_regclass('public.crm_opportunity_customer_bindings') as relation",
  );
  if (!table.rows[0]?.relation) throw new Error("V13_BINDING_TABLE_MISSING");

  const trigger = await client.query(
    "select 1 from pg_trigger where tgname = $1 and not tgisinternal",
    ["customer_secure_document_opportunity_binding_guard"],
  );
  if (trigger.rowCount !== 1) throw new Error("V13_DOCUMENT_GUARD_MISSING");

  console.log("PASS production startup installed v13 customer opportunity binding");
} finally {
  await client.end();
}
