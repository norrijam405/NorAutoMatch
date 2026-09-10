import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const migrations = [
  "infrastructure/norautomatch-crm-v1.sql",
  "infrastructure/norautomatch-crm-v2-manager-handoffs.sql",
  "infrastructure/norautomatch-crm-v3-outbox-relay.sql",
];

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function applyMigrations(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS norautomatch_schema_migrations (
        migration_name TEXT PRIMARY KEY,
        sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
        release_sha TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migrationName of migrations) {
      const sql = await readFile(migrationName, "utf8");
      const digest = sha256(sql);
      const existing = await client.query(
        "SELECT sha256 FROM norautomatch_schema_migrations WHERE migration_name = $1",
        [migrationName],
      );

      if (existing.rowCount === 1) {
        const recorded = existing.rows[0].sha256.trim();
        if (recorded !== digest) {
          throw new Error(
            `MIGRATION_CHECKSUM_MISMATCH:${migrationName}:recorded=${recorded}:current=${digest}`,
          );
        }
        console.log(`MIGRATION_ALREADY_APPLIED ${migrationName} ${digest}`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO norautomatch_schema_migrations
             (migration_name, sha256, release_sha)
           VALUES ($1, $2, $3)`,
          [migrationName, digest, process.env.NORAUTO_RELEASE_SHA || "UNKNOWN_RELEASE_SHA"],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      console.log(`MIGRATION_APPLIED ${migrationName} ${digest}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();

  if (connectionString) {
    await applyMigrations(connectionString);
  } else {
    console.log("MIGRATION_SKIPPED NORAUTO_CRM_DATABASE_URL_NOT_CONFIGURED");
  }

  if (process.env.NORAUTO_MIGRATION_ONLY === "1") {
    console.log("MIGRATION_ONLY_COMPLETE");
    return;
  }

  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
    { stdio: "inherit", env: process.env },
  );

  const forward = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  process.on("SIGTERM", () => forward("SIGTERM"));
  process.on("SIGINT", () => forward("SIGINT"));

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error("NORAUTO_PRODUCTION_START_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
