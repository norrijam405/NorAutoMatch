import assert from "node:assert/strict";
import { evaluateProductionReadiness } from "../src/lib/production-readiness";

const base = {
  NORAUTO_CRM_DATABASE_URL: "postgresql://user:password@db.example.com:5432/norauto",
  NORAUTO_RELAY_TRIGGER_TOKEN: "relay-token-abcdefghijklmnopqrstuvwxyz-123456",
  NORAUTO_MANAGER_SESSION_SECRET: "manager-secret-abcdefghijklmnopqrstuvwxyz-123456",
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
expectFailure({ NORAUTO_RELAY_TRIGGER_TOKEN: "short" }, "RELAY_TRIGGER_TOKEN");
expectFailure({ NORAUTO_MANAGER_SESSION_SECRET: "short" }, "MANAGER_SESSION_SECRET");
expectFailure({ NORAUTO_MANAGER_SESSION_SECRET: base.NORAUTO_RELAY_TRIGGER_TOKEN }, "CREDENTIAL_SEPARATION");
expectFailure({ NEXT_PUBLIC_SITE_URL: "http://norautomatch.example.com" }, "SITE_URL");
expectFailure({ NEXT_PUBLIC_SITE_URL: "https://localhost:3000" }, "SITE_URL");
expectFailure({ CRM_WEBHOOK_URL: "http://crm.example.com/hook" }, "CRM_WEBHOOK_URL");
expectFailure({ NORAUTO_INVENTORY_MODE: "production" }, "INVENTORY_MODE");
expectFailure({ NORAUTO_INVENTORY_MODE: "live-enabled", NORAUTO_LIVE_INVENTORY_ACTIVATION: "" }, "LIVE_INVENTORY_ACTIVATION");
expectFailure({ NORAUTO_INVENTORY_MODE: "demo", NORAUTO_LIVE_INVENTORY_ACTIVATION: "ENABLE_ORR_LIVE_CUSTOMER_INVENTORY" }, "LIVE_INVENTORY_ACTIVATION");

const serialized = JSON.stringify(demo);
assert(!serialized.includes(base.NORAUTO_RELAY_TRIGGER_TOKEN));
assert(!serialized.includes(base.NORAUTO_MANAGER_SESSION_SECRET));
assert(!serialized.includes("password@db.example.com"));

console.log("PASS_NORAUTO_PRODUCTION_CONFIG_PREFLIGHT_BEHAVIOR");
