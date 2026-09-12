import assert from "node:assert/strict";
import { evaluateProductionReadiness } from "../src/lib/production-readiness";

const base = {
  NORAUTO_CRM_DATABASE_URL: "postgresql://user:password@db.example.com:5432/norauto",
  NORAUTO_PUBLIC_ABUSE_HMAC_SECRET: "abuse-hmac-secret-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_RELAY_ASSERTION_SECRET: "relay-assertion-secret-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET: "",
  NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET: "conversation-assertion-secret-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET: "",
  NORAUTO_MANAGER_SESSION_SECRET: "manager-secret-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET: "",
  NEXT_PUBLIC_SITE_URL: "https://norautomatch.example.com",
  CRM_WEBHOOK_URL: "",
  NORAUTO_INVENTORY_MODE: "demo",
  NORAUTO_LIVE_INVENTORY_ACTIVATION: "",
};

function expectFailure(overrides: Record<string, string>, expectedId: string) {
  const result = evaluateProductionReadiness({ ...base, ...overrides });
  assert.equal(result.ready, false);
  assert.equal(result.truthState, "CONFIGURATION_PREFLIGHT_ONLY");
  assert.equal(result.authorityEffect, "NONE");
  assert(result.checks.some((check) => check.id === expectedId && check.status === "FAIL"));
}

const demo = evaluateProductionReadiness(base);
assert.equal(demo.ready, true);
assert.deepEqual(demo.proves, ["STATIC_CONFIGURATION_CONTRACT"]);
assert(demo.doesNotProve.includes("PRODUCTION_DEPLOYMENT"));
assert(demo.doesNotProve.includes("USER_LIVE_VALIDATION"));
assert.equal(demo.checks.every((check) => check.status === "PASS"), true);

const rollover = evaluateProductionReadiness({
  ...base,
  NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET: "relay-previous-secret-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET: "conversation-previous-secret-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET: "manager-previous-secret-abcdefghijklmnopqrstuvwxyz-123456",
});
assert.equal(rollover.ready, true, "Distinct structurally valid previous keys must support a bounded rollover window.");

const shadow = evaluateProductionReadiness({ ...base, NORAUTO_INVENTORY_MODE: "live-shadow" });
assert.equal(shadow.ready, true);

const live = evaluateProductionReadiness({
  ...base,
  NORAUTO_INVENTORY_MODE: "live-enabled",
  NORAUTO_LIVE_INVENTORY_ACTIVATION: "ENABLE_ORR_LIVE_CUSTOMER_INVENTORY",
});
assert.equal(live.ready, true);

expectFailure({ NORAUTO_CRM_DATABASE_URL: "postgresql://user:password@localhost:5432/norauto" }, "CRM_DATABASE_URL");
expectFailure({ NORAUTO_CRM_DATABASE_URL: "https://db.example.com/norauto" }, "CRM_DATABASE_URL");
expectFailure({ NORAUTO_PUBLIC_ABUSE_HMAC_SECRET: "short" }, "PUBLIC_ABUSE_HMAC_SECRET");
expectFailure({ NORAUTO_RELAY_ASSERTION_SECRET: "short" }, "RELAY_ASSERTION_SECRET");
expectFailure({ NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET: "short" }, "RELAY_ASSERTION_PREVIOUS_SECRET");
expectFailure({ NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET: base.NORAUTO_RELAY_ASSERTION_SECRET }, "RELAY_ASSERTION_PREVIOUS_SECRET");
expectFailure({ NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET: "short" }, "CONVERSATION_GATEWAY_ASSERTION_SECRET");
expectFailure({ NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET: "short" }, "CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET");
expectFailure({ NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET: base.NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET }, "CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET");
expectFailure({ NORAUTO_MANAGER_SESSION_SECRET: "short" }, "MANAGER_SESSION_SECRET");
expectFailure({ NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET: "short" }, "MANAGER_SESSION_PREVIOUS_SECRET");
expectFailure({ NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET: base.NORAUTO_MANAGER_SESSION_SECRET }, "MANAGER_SESSION_PREVIOUS_SECRET");
expectFailure({ NORAUTO_MANAGER_SESSION_SECRET: base.NORAUTO_RELAY_ASSERTION_SECRET }, "CREDENTIAL_SEPARATION");
expectFailure({ NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET: base.NORAUTO_RELAY_ASSERTION_SECRET }, "CREDENTIAL_SEPARATION");
expectFailure({ NORAUTO_PUBLIC_ABUSE_HMAC_SECRET: base.NORAUTO_MANAGER_SESSION_SECRET }, "CREDENTIAL_SEPARATION");
expectFailure({ NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET: base.NORAUTO_MANAGER_SESSION_SECRET }, "CREDENTIAL_SEPARATION");
expectFailure({ NEXT_PUBLIC_SITE_URL: "http://norautomatch.example.com" }, "SITE_URL");
expectFailure({ NEXT_PUBLIC_SITE_URL: "https://localhost:3000" }, "SITE_URL");
expectFailure({ CRM_WEBHOOK_URL: "http://crm.example.com/hook" }, "CRM_WEBHOOK_URL");
expectFailure({ NORAUTO_INVENTORY_MODE: "production" }, "INVENTORY_MODE");
expectFailure({ NORAUTO_INVENTORY_MODE: "live-enabled", NORAUTO_LIVE_INVENTORY_ACTIVATION: "" }, "LIVE_INVENTORY_ACTIVATION");
expectFailure({ NORAUTO_INVENTORY_MODE: "demo", NORAUTO_LIVE_INVENTORY_ACTIVATION: "ENABLE_ORR_LIVE_CUSTOMER_INVENTORY" }, "LIVE_INVENTORY_ACTIVATION");

const serialized = JSON.stringify(demo);
for (const secret of [
  base.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET,
  base.NORAUTO_RELAY_ASSERTION_SECRET,
  base.NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET,
  base.NORAUTO_MANAGER_SESSION_SECRET,
]) {
  assert(!serialized.includes(secret), "Production preflight results must not serialize configured security secrets.");
}
assert(!serialized.includes("password@db.example.com"));
assert(!serialized.includes("NORAUTO_RELAY_TRIGGER_TOKEN"), "Production preflight must not rely on the retired static relay bearer token.");

console.log("PASS_NORAUTO_PRODUCTION_CONFIG_PREFLIGHT_SECRET_LIFECYCLE");
