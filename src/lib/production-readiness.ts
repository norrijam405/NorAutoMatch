export type ProductionReadinessCheckId =
  | "CRM_DATABASE_URL"
  | "RELAY_TRIGGER_TOKEN"
  | "MANAGER_SESSION_SECRET"
  | "CREDENTIAL_SEPARATION"
  | "SITE_URL"
  | "CRM_WEBHOOK_URL"
  | "INVENTORY_MODE"
  | "LIVE_INVENTORY_ACTIVATION";

export type ProductionReadinessCheck = {
  id: ProductionReadinessCheckId;
  status: "PASS" | "FAIL";
  message: string;
};

export type ProductionReadinessResult = {
  protocol: "NORAUTO_PRODUCTION_CONFIG_PREFLIGHT_V1";
  truthState: "CONFIGURATION_PREFLIGHT_ONLY";
  ready: boolean;
  checks: ProductionReadinessCheck[];
  authorityEffect: "NONE";
  proves: readonly ["STATIC_CONFIGURATION_CONTRACT"];
  doesNotProve: readonly [
    "DATABASE_CONNECTIVITY",
    "EXTERNAL_CRM_DELIVERY",
    "LIVE_INVENTORY_FRESHNESS",
    "PRODUCTION_DEPLOYMENT",
    "PRODUCTION_AUTHORITY",
    "USER_LIVE_VALIDATION",
  ];
};

type Environment = Record<string, string | undefined>;

const LIVE_ACTIVATION = "ENABLE_ORR_LIVE_CUSTOMER_INVENTORY";
const ALLOWED_INVENTORY_MODES = new Set(["demo", "live-shadow", "live-enabled"]);

function value(env: Environment, key: string) {
  return (env[key] ?? "").trim();
}

function checkUrl(raw: string, options: { protocols: string[]; rejectLocalhost: boolean }) {
  try {
    const parsed = new URL(raw);
    if (!options.protocols.includes(parsed.protocol)) return false;
    if (options.rejectLocalhost) {
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function push(checks: ProductionReadinessCheck[], id: ProductionReadinessCheckId, ok: boolean, pass: string, fail: string) {
  checks.push({ id, status: ok ? "PASS" : "FAIL", message: ok ? pass : fail });
}

export function evaluateProductionReadiness(env: Environment): ProductionReadinessResult {
  const checks: ProductionReadinessCheck[] = [];

  const databaseUrl = value(env, "NORAUTO_CRM_DATABASE_URL");
  push(checks, "CRM_DATABASE_URL", checkUrl(databaseUrl, { protocols: ["postgres:", "postgresql:"], rejectLocalhost: true }), "Durable CRM database URL is structurally production-shaped.", "NORAUTO_CRM_DATABASE_URL must be a non-local PostgreSQL URL before production intake.");

  const relayToken = value(env, "NORAUTO_RELAY_TRIGGER_TOKEN");
  push(checks, "RELAY_TRIGGER_TOKEN", relayToken.length >= 32, "Machine relay credential meets the minimum length boundary.", "NORAUTO_RELAY_TRIGGER_TOKEN must be at least 32 characters.");

  const managerSecret = value(env, "NORAUTO_MANAGER_SESSION_SECRET");
  push(checks, "MANAGER_SESSION_SECRET", managerSecret.length >= 32, "Manager session verification secret meets the minimum length boundary.", "NORAUTO_MANAGER_SESSION_SECRET must be at least 32 characters.");

  push(checks, "CREDENTIAL_SEPARATION", relayToken.length >= 32 && managerSecret.length >= 32 && relayToken !== managerSecret, "Manager and machine-relay credentials are separated.", "Manager session and machine relay credentials must be distinct secrets.");

  const siteUrl = value(env, "NEXT_PUBLIC_SITE_URL");
  push(checks, "SITE_URL", checkUrl(siteUrl, { protocols: ["https:"], rejectLocalhost: true }), "Public site URL is HTTPS and non-local.", "NEXT_PUBLIC_SITE_URL must be a non-local HTTPS URL for production.");

  const crmWebhook = value(env, "CRM_WEBHOOK_URL");
  push(checks, "CRM_WEBHOOK_URL", !crmWebhook || checkUrl(crmWebhook, { protocols: ["https:"], rejectLocalhost: true }), crmWebhook ? "External CRM webhook is HTTPS and non-local." : "External CRM webhook is intentionally unconfigured; durable outbox remains authoritative.", "CRM_WEBHOOK_URL must be blank or a non-local HTTPS URL.");

  const inventoryMode = value(env, "NORAUTO_INVENTORY_MODE") || "demo";
  push(checks, "INVENTORY_MODE", ALLOWED_INVENTORY_MODES.has(inventoryMode), `Inventory mode ${inventoryMode} is recognized.`, "NORAUTO_INVENTORY_MODE must be demo, live-shadow, or live-enabled.");

  const activation = value(env, "NORAUTO_LIVE_INVENTORY_ACTIVATION");
  const activationValid = inventoryMode === "live-enabled" ? activation === LIVE_ACTIVATION : activation === "";
  push(checks, "LIVE_INVENTORY_ACTIVATION", activationValid, inventoryMode === "live-enabled" ? "Customer-visible live inventory has the exact second-gate activation value." : "Customer-visible live inventory activation remains unset outside live-enabled mode.", inventoryMode === "live-enabled" ? `NORAUTO_LIVE_INVENTORY_ACTIVATION must equal ${LIVE_ACTIVATION} when live-enabled.` : "NORAUTO_LIVE_INVENTORY_ACTIVATION must remain blank unless inventory mode is live-enabled.");

  return {
    protocol: "NORAUTO_PRODUCTION_CONFIG_PREFLIGHT_V1",
    truthState: "CONFIGURATION_PREFLIGHT_ONLY",
    ready: checks.every((check) => check.status === "PASS"),
    checks,
    authorityEffect: "NONE",
    proves: ["STATIC_CONFIGURATION_CONTRACT"],
    doesNotProve: ["DATABASE_CONNECTIVITY", "EXTERNAL_CRM_DELIVERY", "LIVE_INVENTORY_FRESHNESS", "PRODUCTION_DEPLOYMENT", "PRODUCTION_AUTHORITY", "USER_LIVE_VALIDATION"],
  };
}
