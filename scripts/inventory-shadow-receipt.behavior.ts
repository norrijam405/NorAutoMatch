import assert from "node:assert/strict";
import { buildInventoryShadowReceipt } from "../src/lib/inventory-shadow-receipt";
import type { OrrAlgoliaDiscovery, OrrAlgoliaHit } from "../src/lib/orr-public-algolia";

const fetchedAt = "2026-09-09T22:50:00.000Z";

function hit(overrides: Partial<OrrAlgoliaHit> = {}): OrrAlgoliaHit {
  return {
    objectID: "1",
    id: 1,
    dealer_id: 2175,
    dealer_ids: [2175],
    dealership: "Orr Nissan West",
    vin: "5N1BT3BA8TC882931",
    stock_number: "TC882931",
    make_year: 2026,
    make: "Nissan",
    model: "Rogue",
    car_trim: "SV",
    price: 31500,
    msrp: 34000,
    odometer: 12,
    car_condition: "New",
    category: "SUV",
    drivetrain: "FWD",
    is_active: true,
    archived: false,
    on_hold: false,
    stock_status: "in_stock",
    in_transit: false,
    ...overrides,
  };
}

function discovery(hits: OrrAlgoliaHit[], overrides: Partial<OrrAlgoliaDiscovery> = {}): OrrAlgoliaDiscovery {
  return {
    sourceUrl: "https://orrnissanwest.com/inventory",
    sourceHash: "a".repeat(64),
    fetchedAt,
    indexName: "production-inventory-global_price_desc",
    dealerId: 2175,
    hits,
    reportedHitCount: hits.length,
    pagesFetched: 1,
    completeSnapshot: true,
    ...overrides,
  };
}

const healthy = buildInventoryShadowReceipt(discovery([hit()]));
assert.equal(healthy.protocol, "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1");
assert.equal(healthy.truthState, "PUBLIC_SOURCE_SHADOW_OBSERVATION");
assert.equal(healthy.customerVisibleLiveInventory, false);
assert.equal(healthy.authorityEffect, "NONE");
assert.equal(healthy.gate.status, "PASS");
assert.deepEqual(healthy.gate.reasons, []);
assert.equal(healthy.source.dealerId, 2175);
assert.equal(healthy.source.rawHitCount, 1);
assert.equal(healthy.normalization.eligibleCount, 1);
assert.equal(healthy.normalization.blockingErrorCount, 0);
assert.equal(healthy.normalization.inactiveExcludedCount, 0);
assert.deepEqual(healthy.normalization.issueCounts, {});
assert(healthy.doesNotProve.includes("CUSTOMER_VISIBLE_LIVE_INVENTORY"));
assert(healthy.doesNotProve.includes("VENDOR_API_AUTHORIZATION"));

const inactivePlusHealthy = buildInventoryShadowReceipt(discovery([
  hit({ objectID: "active" }),
  hit({ objectID: "inactive", vin: "1N4BL4DV9SN320880", is_active: false }),
]));
assert.equal(inactivePlusHealthy.gate.status, "PASS");
assert.equal(inactivePlusHealthy.normalization.errorCount, 1);
assert.equal(inactivePlusHealthy.normalization.blockingErrorCount, 0);
assert.equal(inactivePlusHealthy.normalization.inactiveExcludedCount, 1);
assert.equal(inactivePlusHealthy.normalization.issueCounts.INACTIVE_HIT, 1);
assert.equal(inactivePlusHealthy.normalization.eligibleCount, 1);

const inactiveOnly = buildInventoryShadowReceipt(discovery([hit({ is_active: false })]));
assert.equal(inactiveOnly.gate.status, "FAIL");
assert(inactiveOnly.gate.reasons.includes("ZERO_NORMALIZED_INVENTORY"));
assert(inactiveOnly.gate.reasons.includes("ZERO_MATCH_ELIGIBLE_INVENTORY"));
assert(!inactiveOnly.gate.reasons.includes("NORMALIZATION_ERROR_INACTIVE_HIT"));

const incomplete = buildInventoryShadowReceipt(discovery([hit()], { completeSnapshot: false, reportedHitCount: 2 }));
assert.equal(incomplete.gate.status, "FAIL");
assert(incomplete.gate.reasons.includes("SNAPSHOT_INCOMPLETE"));
assert(incomplete.gate.reasons.includes("HIT_COUNT_MISMATCH"));

const empty = buildInventoryShadowReceipt(discovery([]));
assert.equal(empty.gate.status, "FAIL");
assert(empty.gate.reasons.includes("ZERO_REPORTED_INVENTORY"));
assert(empty.gate.reasons.includes("ZERO_NORMALIZED_INVENTORY"));
assert(empty.gate.reasons.includes("ZERO_MATCH_ELIGIBLE_INVENTORY"));

const parserDefect = buildInventoryShadowReceipt(discovery([hit({ vin: undefined })]));
assert.equal(parserDefect.gate.status, "FAIL");
assert(parserDefect.gate.reasons.includes("NORMALIZATION_ERROR_VIN_INVALID"));
assert.equal(parserDefect.normalization.issueCounts.VIN_INVALID, 1);
assert.equal(parserDefect.normalization.blockingErrorCount, 1);

const twoErrorClasses = buildInventoryShadowReceipt(discovery([
  hit({ objectID: "1", vin: undefined }),
  hit({ objectID: "2", vin: "1N4BL4DV9SN320880", price: 0, functional_price: 0 }),
]));
assert.equal(twoErrorClasses.gate.status, "FAIL");
assert(twoErrorClasses.gate.reasons.includes("NORMALIZATION_ERROR_VIN_INVALID"));
assert(twoErrorClasses.gate.reasons.includes("NORMALIZATION_ERROR_PRICE_INVALID"));
assert.equal(twoErrorClasses.normalization.issueCounts.VIN_INVALID, 1);
assert.equal(twoErrorClasses.normalization.issueCounts.PRICE_INVALID, 1);
assert.equal(twoErrorClasses.normalization.blockingErrorCount, 2);

const warningOnly = buildInventoryShadowReceipt(discovery([hit({ stock_number: undefined })]));
assert.equal(warningOnly.normalization.warningCount, 1);
assert.equal(warningOnly.normalization.errorCount, 0);
assert.equal(warningOnly.normalization.issueCounts.STOCK_NUMBER_MISSING, 1);
assert.equal(warningOnly.gate.status, "PASS");

const serialized = JSON.stringify(healthy);
assert(!serialized.includes("ALGOLIA_API_KEY"));
assert(!serialized.includes("ALGOLIA_APP_ID"));

console.log("PASS_NORAUTO_INVENTORY_SHADOW_RECEIPT_BEHAVIOR");
