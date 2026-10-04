import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const REQUIRED_INPUTS = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "Dockerfile",
  "PUBLIC_LAUNCH_RUNBOOK.md",
  "scripts/start-production.mjs",
  "infrastructure/norautomatch-crm-v1.sql",
  "infrastructure/norautomatch-crm-v2-manager-handoffs.sql",
  "infrastructure/norautomatch-crm-v3-outbox-relay.sql",
  "infrastructure/norautomatch-crm-v4-conversation-events.sql",
];

function fail(code, detail = "") {
  const suffix = detail ? `:${detail}` : "";
  throw new Error(`${code}${suffix}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireTrimmed(name) {
  const value = process.env[name]?.trim();
  if (!value) fail("REPEATABILITY_REQUIRED_ENV_MISSING", name);
  return value;
}

function validateReleaseSha(value) {
  if (!/^[0-9a-f]{40}$/i.test(value)) fail("REPEATABILITY_RELEASE_SHA_INVALID", value);
}

function validateHttpsOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("REPEATABILITY_SITE_URL_INVALID", value);
  }
  if (url.protocol !== "https:") fail("REPEATABILITY_SITE_URL_NOT_HTTPS", value);
  if (url.pathname !== "/" || url.search || url.hash) fail("REPEATABILITY_SITE_URL_NOT_ORIGIN", value);
}

async function readRequired(path) {
  if (!existsSync(resolve(path))) fail("REPEATABILITY_REQUIRED_INPUT_MISSING", path);
  return readFile(path);
}

async function main() {
  const workspaceId = requireTrimmed("NORAUTO_REPEATABILITY_WORKSPACE_ID");
  const releaseSha = requireTrimmed("NORAUTO_RELEASE_SHA");
  const siteUrl = requireTrimmed("NEXT_PUBLIC_SITE_URL");
  const inventoryMode = requireTrimmed("NORAUTO_INVENTORY_MODE");
  const liveActivation = process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION?.trim() || "";

  validateReleaseSha(releaseSha);
  validateHttpsOrigin(siteUrl);
  if (inventoryMode !== "demo") fail("REPEATABILITY_INVENTORY_MODE_MUST_BE_DEMO", inventoryMode);
  if (liveActivation) fail("REPEATABILITY_LIVE_INVENTORY_MUST_REMAIN_DISABLED");

  const fileHashes = {};
  for (const path of REQUIRED_INPUTS) {
    const bytes = await readRequired(path);
    fileHashes[path] = sha256(bytes);
  }

  const nextConfig = (await readFile("next.config.ts", "utf8"));
  if (!nextConfig.includes('output: "standalone"')) fail("REPEATABILITY_STANDALONE_OUTPUT_NOT_CONFIGURED");

  const dockerfile = (await readFile("Dockerfile", "utf8"));
  if (!dockerfile.includes("USER nextjs")) fail("REPEATABILITY_CONTAINER_NOT_NONROOT");
  if (!dockerfile.includes("/api/health")) fail("REPEATABILITY_HEALTHCHECK_MISSING");
  if (!dockerfile.includes("NORAUTO_RELEASE_SHA")) fail("REPEATABILITY_RELEASE_SHA_NOT_BOUND_TO_IMAGE");

  const startProduction = (await readFile("scripts/start-production.mjs", "utf8"));
  if (!startProduction.includes("MIGRATION_CHECKSUM_MISMATCH")) fail("REPEATABILITY_MIGRATION_DRIFT_GUARD_MISSING");
  if (!startProduction.includes("norautomatch-crm-v4-conversation-events.sql")) fail("REPEATABILITY_LATEST_MIGRATION_MISSING");

  const standaloneServer = resolve(".next/standalone/server.js");
  if (!existsSync(standaloneServer)) fail("REPEATABILITY_STANDALONE_BUILD_ARTIFACT_MISSING");

  const fingerprintPayload = JSON.stringify({
    schema: "NORAUTOMATCH_DEPLOYMENT_REPEATABILITY_PREFLIGHT_V1",
    workspaceId,
    releaseSha: releaseSha.toLowerCase(),
    siteUrl,
    inventoryMode,
    customerVisibleLiveInventory: false,
    fileHashes,
  });

  const receipt = {
    schema: "NORAUTOMATCH_DEPLOYMENT_REPEATABILITY_PREFLIGHT_V1",
    status: "PREFLIGHT_VERIFIED_NOT_DEPLOYED",
    authorityEffect: "NONE",
    workspaceId,
    releaseSha: releaseSha.toLowerCase(),
    siteUrl,
    inventoryMode,
    customerVisibleLiveInventory: false,
    standaloneArtifactPresent: true,
    migrationDriftGuardPresent: true,
    containerRunsAsNonRoot: true,
    healthBoundary: "/api/health",
    requiredInputHashes: fileHashes,
    deploymentFingerprintSha256: sha256(fingerprintPayload),
    externalSideEffects: [],
    outcomeClaims: {
      deployed: false,
      serving: false,
      databaseMigrated: false,
      leadPersisted: false,
      customerTrafficReceived: false,
    },
    nextRequiredEvidence: [
      "authorized controlled deployment or new-workspace exercise",
      "exact deployed release SHA",
      "post-deploy /api/health receipt",
      "representative inventory disclosure check",
      "security header checks",
      "controlled synthetic lead persistence evidence when database is present",
      "rollback evidence",
      "independent verification",
    ],
  };

  const outputPath = process.env.NORAUTO_REPEATABILITY_RECEIPT_PATH?.trim();
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(receipt));
}

main().catch((error) => {
  console.error("NORAUTO_DEPLOYMENT_REPEATABILITY_PREFLIGHT_FAILED", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
