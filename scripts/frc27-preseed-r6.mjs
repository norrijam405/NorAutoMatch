import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const migration="infrastructure/norautomatch-site-chat-publication-secret-rotation-r6.sql";
try {
  const hash=createHash("sha256").update(await readFile(migration)).digest("hex");
  await pool.query(`
    create table if not exists norautomatch_schema_migrations (
      migration_name text primary key,
      sha256 char(64) not null check (sha256 ~ '^[0-9a-f]{64}$'),
      release_sha text not null,
      applied_at timestamptz not null default current_timestamp
    )
  `);
  await pool.query(
    "insert into norautomatch_schema_migrations(migration_name,sha256,release_sha) values ($1,$2,'round5-r6-preseed')",
    [migration,hash]
  );
  console.log("ROUND5_D5_R6_PRESEED_READY");
} finally { await pool.end(); }
