import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const migrations = [
  "infrastructure/norautomatch-crm-v1.sql",
  "infrastructure/norautomatch-crm-v2-manager-handoffs.sql",
  "infrastructure/norautomatch-crm-v3-outbox-relay.sql",
  "infrastructure/norautomatch-crm-v4-conversation-events.sql",
  "infrastructure/norautomatch-crm-v5-machine-assertion-replay.sql",
  "infrastructure/norautomatch-crm-v6-public-abuse-control.sql",
  "infrastructure/norautomatch-crm-v7-data-lifecycle.sql",
  "infrastructure/norautomatch-crm-v8-abuse-retention.sql",
  "infrastructure/norautomatch-crm-v9-lifecycle-audit-hardening.sql",
  "infrastructure/norautomatch-crm-v10-legal-hold-dispositions.sql",
  "infrastructure/norautomatch-crm-v11-manager-session-revocation.sql",
  "infrastructure/norautomatch-crm-v12-inventory-provider-cache.sql",
  "infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql",
  "infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql",
  "infrastructure/norautomatch-crm-v15-customer-binding-secret-rotation.sql",
  "infrastructure/norautomatch-conversation-ownership-r0.sql",
  "infrastructure/norautomatch-conversation-communication-ledger-r0.sql",
  "infrastructure/norautomatch-site-chat-thread-r0.sql",
  "infrastructure/norautomatch-site-chat-access-integrity-r1.sql",
  "infrastructure/norautomatch-site-chat-access-authenticity-r2.sql",
  "infrastructure/norautomatch-site-chat-publication-authenticity-r3.sql",
  "infrastructure/norautomatch-site-chat-publication-secret-anchor-r4.sql",
  "infrastructure/norautomatch-site-chat-schema-qualified-trust-r5.sql",
  "infrastructure/norautomatch-site-chat-publication-secret-rotation-r6.sql",
];

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function verifyMigrationInvariant(client, migrationName) {
  if (migrationName === "infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql") {
    const result = await client.query(`
      select
        to_regclass('public.crm_opportunity_customer_bindings') is not null as binding_table,
        exists (
          select 1 from pg_trigger
           where tgname='customer_secure_document_opportunity_binding_guard'
             and not tgisinternal
        ) as document_guard
    `);
    const row = result.rows[0];
    if (!row?.binding_table || !row?.document_guard) {
      throw new Error("MIGRATION_INVARIANT_MISSING:infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql");
    }
  }

  if (migrationName === "infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql") {
    const result = await client.query(`
      select
        to_regclass('public.crm_customer_binding_secret_anchor') is not null as trust_anchor,
        exists (
          select 1 from pg_trigger
           where tgname='crm_opportunity_customer_bindings_insert_authenticity'
             and not tgisinternal
        ) as insert_guard
    `);
    const row = result.rows[0];
    if (!row?.trust_anchor || !row?.insert_guard) {
      throw new Error("MIGRATION_INVARIANT_MISSING:infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql");
    }
  }
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
          throw new Error(`MIGRATION_CHECKSUM_MISMATCH:${migrationName}:recorded=${recorded}:current=${digest}`);
        }
        await verifyMigrationInvariant(client, migrationName);
        console.log(`MIGRATION_ALREADY_APPLIED ${migrationName} ${digest}`);
        continue;
      }

      await client.query("BEGIN");
      try {
        if (migrationName === "infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql") {
          const bindingSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
          if (bindingSecret.length < 32) {
            throw new Error("CUSTOMER_BINDING_TRUST_ANCHOR_SECRET_NOT_CONFIGURED");
          }
          await client.query(
            "select set_config('norautomatch.bootstrap_customer_binding_hmac_secret', $1, true)",
            [bindingSecret],
          );
        }

        if (migrationName === "infrastructure/norautomatch-site-chat-publication-secret-anchor-r4.sql") {
          const currentSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
          const previousSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim() ?? "";

          if (currentSecret.length < 32) {
            throw new Error("SITE_CHAT_PUBLICATION_TRUST_ANCHOR_SECRET_NOT_CONFIGURED");
          }
          if (previousSecret && previousSecret.length < 32) {
            throw new Error("SITE_CHAT_PUBLICATION_TRUST_ANCHOR_PREVIOUS_SECRET_INVALID");
          }
          if (previousSecret && previousSecret === currentSecret) {
            throw new Error("SITE_CHAT_PUBLICATION_TRUST_ANCHOR_ROTATION_INVALID");
          }

          await client.query(
            "select set_config('norautomatch.bootstrap_site_chat_publication_hmac_secret', $1, true)",
            [currentSecret],
          );
          await client.query(
            "select set_config('norautomatch.bootstrap_site_chat_publication_previous_hmac_secret', $1, true)",
            [previousSecret],
          );
        }

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

      await verifyMigrationInvariant(client, migrationName);
      console.log(`MIGRATION_APPLIED ${migrationName} ${digest}`);
    }

    const bindingCurrentSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
    if (bindingCurrentSecret.length >= 32) {
      const anchor = await client.query(
        `select binding_secret_sha256, previous_secret_sha256
           from public.crm_customer_binding_secret_anchor
          where anchor_id='ACTIVE'`,
      );

      if (anchor.rowCount === 1) {
        const bindingDigest = (secret) =>
          sha256(`norautomatch:customer-binding:v1\u001f${secret}`);

        const expectedCurrent = bindingDigest(bindingCurrentSecret);
        const recordedCurrent = anchor.rows[0].binding_secret_sha256?.trim();

        if (recordedCurrent !== expectedCurrent) {
          const bindingPreviousSecret =
            process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim() ?? "";
          if (bindingPreviousSecret.length < 32) {
            throw new Error("CUSTOMER_BINDING_ROTATION_PREVIOUS_SECRET_REQUIRED");
          }

          await client.query("BEGIN");
          try {
            await client.query(
              "select set_config('norautomatch.customer_binding_rotation_current_secret', $1, true)",
              [bindingCurrentSecret],
            );
            await client.query(
              "select set_config('norautomatch.customer_binding_rotation_previous_secret', $1, true)",
              [bindingPreviousSecret],
            );
            await client.query(
              `update public.crm_customer_binding_secret_anchor
                  set binding_secret_sha256=$1,
                      previous_secret_sha256=$2
                where anchor_id='ACTIVE'`,
              [expectedCurrent, recordedCurrent],
            );
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          }

          console.log(`CUSTOMER_BINDING_TRUST_ANCHOR_ROTATED ${expectedCurrent}`);
        } else {
          console.log(`CUSTOMER_BINDING_TRUST_ANCHOR_CURRENT ${expectedCurrent}`);
        }
      }
    }

    const siteChatCurrentSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
    if (siteChatCurrentSecret.length >= 32) {
      const siteChatAnchor = await client.query(
        `select current_secret_sha256, previous_secret_sha256
           from public.crm_site_chat_publication_secret_anchor
          where anchor_id='ACTIVE'`,
      );

      if (siteChatAnchor.rowCount === 1) {
        const expectedCurrent = sha256(siteChatCurrentSecret);
        const recordedCurrent = siteChatAnchor.rows[0].current_secret_sha256?.trim();

        if (recordedCurrent !== expectedCurrent) {
          const siteChatPreviousSecret =
            process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim() ?? "";
          if (siteChatPreviousSecret.length < 32) {
            throw new Error("SITE_CHAT_PUBLICATION_ROTATION_PREVIOUS_SECRET_REQUIRED");
          }

          await client.query("BEGIN");
          try {
            await client.query(
              "select set_config('norautomatch.site_chat_rotation_current_secret', $1, true)",
              [siteChatCurrentSecret],
            );
            await client.query(
              "select set_config('norautomatch.site_chat_rotation_previous_secret', $1, true)",
              [siteChatPreviousSecret],
            );
            await client.query(
              `update public.crm_site_chat_publication_secret_anchor
                  set current_secret_sha256=$1,
                      previous_secret_sha256=$2
                where anchor_id='ACTIVE'`,
              [expectedCurrent, recordedCurrent],
            );
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          }

          console.log(`SITE_CHAT_PUBLICATION_TRUST_ANCHOR_ROTATED ${expectedCurrent}`);
        } else {
          console.log(`SITE_CHAT_PUBLICATION_TRUST_ANCHOR_CURRENT ${expectedCurrent}`);
        }
      }
    }
  } finally {
    await client.end();
  }
}

async function prepareStandaloneRuntime() {
  const standaloneDir = resolve(".next/standalone");
  const serverPath = resolve(standaloneDir, "server.js");
  if (!existsSync(serverPath)) {
    throw new Error("STANDALONE_SERVER_MISSING: run npm run build before starting production");
  }

  if (existsSync(resolve("public"))) {
    await cp(resolve("public"), resolve(standaloneDir, "public"), { recursive: true, force: true });
  }
  if (existsSync(resolve(".next/static"))) {
    await cp(resolve(".next/static"), resolve(standaloneDir, ".next/static"), { recursive: true, force: true });
  }

  console.log("STANDALONE_RUNTIME_PREPARED");
  return { standaloneDir, serverPath };
}

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  const skipMigrations = process.env.NORAUTO_SKIP_CRM_MIGRATIONS === "1";

  if (skipMigrations) {
    console.log("MIGRATION_SKIPPED NORAUTO_SKIP_CRM_MIGRATIONS");
  } else if (connectionString) {
    await applyMigrations(connectionString);
  } else {
    console.log("MIGRATION_SKIPPED NORAUTO_CRM_DATABASE_URL_NOT_CONFIGURED");
  }

  if (process.env.NORAUTO_MIGRATION_ONLY === "1") {
    console.log("MIGRATION_ONLY_COMPLETE");
    return;
  }

  const { standaloneDir, serverPath } = await prepareStandaloneRuntime();
  const child = spawn(process.execPath, [serverPath], {
    cwd: standaloneDir,
    stdio: "inherit",
    env: {
      ...process.env,
      HOSTNAME: process.env.NORAUTO_BIND_HOST?.trim() || "0.0.0.0",
    },
  });

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
