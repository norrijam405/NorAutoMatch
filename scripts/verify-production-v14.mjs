import pg from "pg";

const { Client } = pg;
const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const client = new Client({ connectionString });
await client.connect();

try {
  const migration = await client.query(
    "select 1 from norautomatch_schema_migrations where migration_name = $1",
    ["infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql"],
  );
  if (migration.rowCount !== 1) throw new Error("V14_MIGRATION_NOT_RECORDED");

  const anchor = await client.query(
    "select to_regclass('public.crm_customer_binding_secret_anchor') as relation",
  );
  if (!anchor.rows[0]?.relation) throw new Error("V14_BINDING_SECRET_ANCHOR_MISSING");

  const trigger = await client.query(
    "select 1 from pg_trigger where tgname = $1 and not tgisinternal",
    ["crm_opportunity_customer_bindings_insert_authenticity"],
  );
  if (trigger.rowCount !== 1) throw new Error("V14_BINDING_INSERT_AUTHENTICITY_TRIGGER_MISSING");

  const fn = await client.query(
    `select p.proconfig
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname='norautomatch_enforce_customer_binding_insert_authenticity'`,
  );
  if (fn.rowCount !== 1) throw new Error("V14_BINDING_AUTHENTICITY_FUNCTION_MISSING");
  const config = fn.rows[0]?.proconfig ?? [];
  if (!config.some((value) => value === "search_path=pg_catalog, public")) {
    throw new Error("V14_BINDING_AUTHENTICITY_FUNCTION_SEARCH_PATH_NOT_FIXED");
  }

  console.log("PASS production startup installed FRC-16 authenticated customer binding boundary");
} finally {
  await client.end();
}
