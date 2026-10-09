import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const pool = new Pool({ connectionString });
try {
  const result = await pool.query(
    "select to_regclass('public.crm_opportunity_customer_bindings') as bindings, to_regclass('public.crm_customer_binding_secret_anchor') as anchor",
  );

  if (!result.rows[0]?.bindings || !result.rows[0]?.anchor) {
    throw new Error("NEW_FINDING_D2_PRESEEDED_MIGRATION_LEDGER_SKIPS_UNAPPLIED_SECURITY_MIGRATIONS");
  }

  console.log("PASS D2 preseeded migration metadata cannot suppress security migration installation");
} finally {
  await pool.end();
}
