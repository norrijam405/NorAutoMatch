export type ProductionReadinessCheckId =
  | "CRM_DATABASE_URL"
  | "PUBLIC_ABUSE_HMAC_SECRET"
  | "RELAY_ASSERTION_SECRET"
  | "RELAY_ASSERTION_PREVIOUS_SECRET"
  | "CONVERSATION_GATEWAY_ASSERTION_SECRET"
  | "CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET"
  | "MANAGER_SESSION_SECRET"
  | "MANAGER_SESSION_PREVIOUS_SECRET"
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

function validCurrentSecret(secret: string) {
  return secret.length >= 32;
}

function validPreviousSecret(previous: string, current: string) {
  return previous === "" || (previous.length >= 32 && previous !== current);
}

export function evaluateProductionReadiness(env: Environment): ProductionReadinessResult {
  const checks: ProductionReadinessCheck[] = [];

  const databaseUrl = value(env, "NORAUTO_CRM_DATABASE_URL");
  push(checks, "CRM_DATABASE_URL", checkUrl(databaseUrl, { protocols: ["postgres:", "postgresql:"], rejectLocalhost: true }), "Durable CRM database URL is structurally production-shaped.", "NORAUTO_CRM_DATABASE_URL must be a non-local PostgreSQL URL before production intake.");

  const abuseSecret = value(env, "NORAUTO_PUBLIC_ABUSE_HMAC_SECRET");
  const relaySecret = value(env, "NORAUTO_RELAY_ASSERTION_SECRET");
  const relayPrevious = value(env, "NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET");
  const conversationSecret = value(env, "NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET");
  const conversationPrevious = value(env, "NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET");
  const managerSecret = value(env, "NORAUTO_MANAGER_SESSION_SECRET");
  const managerPrevious = value(env, "NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET");

  push(checks, "PUBLIC_ABUSE_HMAC_SECRET", validCurrentSecret(abuseSecret), "Public-abuse pseudonymization secret meets the minimum length boundary.", "NORAUTO_PUBLIC_ABUSE_HMAC_SECRET must be at least 32 characters.");
  push(checks, "RELAY_ASSERTION_SECRET", validCurrentSecret(relaySecret), "CRM relay assertion signing secret meets the minimum length boundary.", "NORAUTO_RELAY_ASSERTION_SECRET must be at least 32 characters.");
  push(checks, "RELAY_ASSERTION_PREVIOUS_SECRET", validPreviousSecret(relayPrevious, relaySecret), relayPrevious ? "Previous relay signing key is structurally valid and distinct from the current key." : "No previous relay signing key is configured outside a rollover window.", "NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET must be blank or a distinct secret of at least 32 characters.");
  push(checks, "CONVERSATION_GATEWAY_ASSERTION_SECRET", validCurrentSecret(conversationSecret), "Conversation gateway assertion signing secret meets the minimum length boundary.", "NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET must be at least 32 characters.");
  push(checks, "CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET", validPreviousSecret(conversationPrevious, conversationSecret), conversationPrevious ? "Previous conversation signing key is structurally valid and distinct from the current key." : "No previous conversation signing key is configured outside a rollover window.", "NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET must be blank or a distinct secret of at least 32 characters.");
  push(checks, "MANAGER_SESSION_SECRET", validCurrentSecret(managerSecret), "Manager session verification secret meets the minimum length boundary.", "NORAUTO_MANAGER_SESSION_SECRET must be at least 32 characters.");
  push(checks, "MANAGER_SESSION_PREVIOUS_SECRET", validPreviousSecret(managerPrevious, managerSecret), managerPrevious ? "Previous manager signing key is structurally valid and distinct from the current key." : "No previous manager signing key is configured outside a rollover window.", "NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET must be blank or a distinct secret of at least 32 characters.");

  const secretValues = [
    abuseSecret,
    relaySecret,
    relayPrevious,
    conversationSecret,
    conversationPrevious,
    managerSecret,
    managerPrevious,
  ].filter(Boolean);
  const allSecretsWellFormed = [abuseSecret, relaySecret, conversationSecret, managerSecret].every(validCurrentSecret) &&
    validPreviousSecret(relayPrevious, relaySecret) &&
    validPreviousSecret(conversationPrevious, conversationSecret) &&
    validPreviousSecret(managerPrevious, managerSecret);
  const secretsAreDistinct = new Set(secretValues).size === secretValues.length;
  push(checks, "CREDENTIAL_SEPARATION", allSecretsWellFormed && secretsAreDistinct, "Security-domain current and rollover secrets are purpose-separated.", "Abuse-control, relay, conversation, manager, and rollover secrets must be distinct and structurally valid.");

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
