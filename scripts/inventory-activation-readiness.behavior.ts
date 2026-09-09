import assert from "node:assert/strict";
import { evaluateInventoryActivationReadiness } from "../src/lib/inventory-activation-readiness";
import type { InventoryShadowReceipt } from "../src/lib/inventory-shadow-receipt";
import type { ProductionReadinessResult } from "../src/lib/production-readiness";

const observedAt = "2026-09-09T23:00:00.000Z";
const nowMs = Date.parse("2026-09-09T23:10:00.000Z");

function production(ready = true): ProductionReadinessResult {
  return {
    protocol: "NORAUTO_PRODUCTION_CONFIG_PREFLIGHT_V1",
    truthState: "CONFIGURATION_PREFLIGHT_ONLY",
    ready,
    checks: [],
    authorityEffect: "NONE",
    proves: ["STATIC_CONFIGURATION_CONTRACT"],
    doesNotProve: ["DATABASE_CONNECTIVITY", "EXTERNAL_CRM_DELIVERY", "LIVE_INVENTORY_FRESHNESS", "PRODUCTION_DEPLOYMENT", "PRODUCTION_AUTHORITY", "USER_LIVE_VALIDATION"],
  };
}

function shadow(overrides: Partial<InventoryShadowReceipt> = {}): InventoryShadowReceipt {
  return {
    protocol: "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1",
    truthState: "PUBLIC_SOURCE_SHADOW_OBSERVATION",
    customerVisibleLiveInventory: false,
    authorityEffect: "NONE",
    source: {
      dealerId: 2175,
      sourceUrl: "https://orrnissanwest.com/inventory",
      sourceHash: "a".repeat(64),
      fetchedAt: observedAt,
      indexName: "production-inventory-global_price_desc",
      pagesFetched: 4,
      reportedHitCount: 304,
      rawHitCount: 304,
    },
    normalization: {
      normalizedCount: 301,
      eligibleCount: 139,
      rejectedCount: 162,
      warningCount: 32,
      errorCount: 3,
      blockingErrorCount: 0,
      inactiveExcludedCount: 3,
      issueCounts: { INACTIVE_HIT: 3, STOCK_NUMBER_MISSING: 32 },
    },
    gate: { status: "PASS", reasons: [] },
    proves: ["READ_ONLY_PUBLIC_SOURCE_OBSERVATION"],
    doesNotProve: ["CUSTOMER_VISIBLE_LIVE_INVENTORY", "PRODUCTION_DEPLOYMENT", "PRODUCTION_AUTHORITY", "FUTURE_SOURCE_AVAILABILITY", "VENDOR_API_AUTHORIZATION"],
    ...overrides,
  };
}

const ready = evaluateInventoryActivationReadiness({ production: production(), shadow: shadow(), nowMs });
assert.equal(ready.protocol, "NORAUTO_INVENTORY_ACTIVATION_READINESS_V1");
assert.equal(ready.truthState, "CONTROLLED_ACTIVATION_REVIEW_PREREQUISITES_ONLY");
assert.equal(ready.readyForControlledReview, true);
assert.equal(ready.authorityEffect, "NONE");
assert.equal(ready.customerVisibleLiveInventory, false);
assert.equal(ready.observationAgeMs, 10 * 60 * 1000);
assert.equal(ready.checks.every((check) => check.status === "PASS"), true);
assert(ready.doesNotProve.includes("ACTIVATION_AUTHORITY"));
assert(ready.doesNotProve.includes("CUSTOMER_VISIBLE_LIVE_INVENTORY"));

const stale = evaluateInventoryActivationReadiness({ production: production(), shadow: shadow(), nowMs: Date.parse("2026-09-09T23:16:00.001Z") });
assert.equal(stale.readyForControlledReview, false);
assert(stale.checks.some((check) => check.id === "OBSERVATION_FRESHNESS" && check.status === "FAIL"));

const future = evaluateInventoryActivationReadiness({ production: production(), shadow: shadow(), nowMs: Date.parse("2026-09-09T22:59:59.999Z") });
assert.equal(future.readyForControlledReview, false);

const badConfig = evaluateInventoryActivationReadiness({ production: production(false), shadow: shadow(), nowMs });
assert.equal(badConfig.readyForControlledReview, false);
assert(badConfig.checks.some((check) => check.id === "PRODUCTION_CONFIG_PREFLIGHT" && check.status === "FAIL"));

const failedShadow = evaluateInventoryActivationReadiness({
  production: production(),
  shadow: shadow({ gate: { status: "FAIL", reasons: ["NORMALIZATION_ERROR_PRICE_INVALID"] } }),
  nowMs,
});
assert.equal(failedShadow.readyForControlledReview, false);
assert(failedShadow.checks.some((check) => check.id === "SHADOW_GATE" && check.status === "FAIL"));

const serialized = JSON.stringify(ready);
assert(!serialized.includes("ENABLE_ORR_LIVE_CUSTOMER_INVENTORY"));
assert(!serialized.includes("NORAUTO_MANAGER_SESSION_SECRET"));
assert(!serialized.includes("NORAUTO_RELAY_TRIGGER_TOKEN"));

console.log("PASS_NORAUTO_INVENTORY_ACTIVATION_READINESS_BEHAVIOR");
