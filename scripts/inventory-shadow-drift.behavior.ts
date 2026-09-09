import assert from "node:assert/strict";
import { compareInventoryShadowReceipts } from "../src/lib/inventory-shadow-drift";
import type { InventoryShadowReceipt } from "../src/lib/inventory-shadow-receipt";

function receipt(overrides: Partial<InventoryShadowReceipt> = {}): InventoryShadowReceipt {
  return {
    protocol: "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1",
    truthState: "PUBLIC_SOURCE_SHADOW_OBSERVATION",
    customerVisibleLiveInventory: false,
    authorityEffect: "NONE",
    source: {
      dealerId: 2175,
      sourceUrl: "https://orrnissanwest.com/inventory",
      sourceHash: "a".repeat(64),
      fetchedAt: "2026-09-09T22:00:00.000Z",
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

const previous = receipt();
const stable = receipt({
  source: { ...previous.source, fetchedAt: "2026-09-09T23:00:00.000Z" },
});
const stableDiff = compareInventoryShadowReceipts(previous, stable);
assert.equal(stableDiff.protocol, "NORAUTO_INVENTORY_SHADOW_DRIFT_V1");
assert.equal(stableDiff.truthState, "SHADOW_OBSERVATION_COMPARISON_ONLY");
assert.equal(stableDiff.authorityEffect, "NONE");
assert.equal(stableDiff.customerVisibleLiveInventory, false);
assert.deepEqual(stableDiff.observations, []);
assert.deepEqual(stableDiff.issueCodeChanges, []);
assert.equal(stableDiff.deltas.rawHitCount, 0);
assert.equal(stableDiff.deltas.eligibleCount, 0);
assert(stableDiff.doesNotProve.includes("SOURCE_STABILITY_OVER_TIME"));
assert(stableDiff.doesNotProve.includes("VEHICLE_SOLD_OR_REMOVED"));

const changed = receipt({
  source: { ...previous.source, fetchedAt: "2026-09-10T00:00:00.000Z", sourceHash: "b".repeat(64), rawHitCount: 300, reportedHitCount: 300 },
  normalization: { ...previous.normalization, normalizedCount: 296, eligibleCount: 135, warningCount: 35, errorCount: 4, blockingErrorCount: 1, inactiveExcludedCount: 3, issueCounts: { INACTIVE_HIT: 3, STOCK_NUMBER_MISSING: 35, PRICE_INVALID: 1 } },
  gate: { status: "FAIL", reasons: ["NORMALIZATION_ERROR_PRICE_INVALID"] },
});
const changedDiff = compareInventoryShadowReceipts(previous, changed);
assert(changedDiff.observations.includes("SOURCE_HASH_CHANGED"));
assert(changedDiff.observations.includes("GATE_PASS_TO_FAIL"));
assert(changedDiff.observations.includes("BLOCKING_ERRORS_INTRODUCED"));
assert(changedDiff.observations.includes("RAW_HIT_COUNT_CHANGED"));
assert(changedDiff.observations.includes("ELIGIBLE_COUNT_CHANGED"));
assert(changedDiff.observations.includes("ISSUE_COUNTS_CHANGED"));
assert.equal(changedDiff.deltas.rawHitCount, -4);
assert.equal(changedDiff.deltas.eligibleCount, -4);
assert.equal(changedDiff.deltas.blockingErrorCount, 1);
assert.deepEqual(changedDiff.issueCodeChanges, [
  { code: "PRICE_INVALID", previous: 0, current: 1, delta: 1 },
  { code: "STOCK_NUMBER_MISSING", previous: 32, current: 35, delta: 3 },
]);

const sourceMove = receipt({
  source: { ...previous.source, fetchedAt: "2026-09-10T01:00:00.000Z", indexName: "replacement-index", sourceUrl: "https://example.com/inventory" },
});
const sourceMoveDiff = compareInventoryShadowReceipts(previous, sourceMove);
assert.equal(sourceMoveDiff.sourceIdentity.indexStable, false);
assert.equal(sourceMoveDiff.sourceIdentity.sourceUrlStable, false);
assert(sourceMoveDiff.observations.includes("INDEX_NAME_CHANGED"));
assert(sourceMoveDiff.observations.includes("SOURCE_URL_CHANGED"));

let sameTimeBlocked = false;
try {
  compareInventoryShadowReceipts(previous, receipt());
} catch {
  sameTimeBlocked = true;
}
assert.equal(sameTimeBlocked, true);

console.log("PASS_NORAUTO_INVENTORY_SHADOW_DRIFT_BEHAVIOR");
