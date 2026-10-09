import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const pool = new Pool({ connectionString });

async function sha256File(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

try {
  await pool.query(`
    create table if not exists norautomatch_schema_migrations (
      migration_name text primary key,
      sha256 char(64) not null check (sha256 ~ '^[0-9a-f]{64}$'),
      release_sha text not null,
      applied_at timestamptz not null default current_timestamp
    )
  `);

  const v13 = "infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql";
  const v14 = "infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql";

  await pool.query(
    `insert into norautomatch_schema_migrations(migration_name,sha256,release_sha)
     values ($1,$2,'fresh-preseed'),($3,$4,'fresh-preseed')`,
    [v13, await sha256File(v13), v14, await sha256File(v14)],
  );

  console.log("PRESEED_READY");
} finally {
  await pool.end();
}
