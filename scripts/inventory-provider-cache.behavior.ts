import assert from "node:assert/strict";
import { buildProviderCachedCatalog } from "../src/lib/inventory-provider-cache-catalog";
import { buildCachedCustomerInventory } from "../src/lib/inventory-provider-cache-reader";
import { reconcileInventoryProviderCurrentState } from "../src/lib/inventory-provider-current-state";
import { assertForwardSnapshotSequence } from "../src/lib/inventory-provider-sync";
import { resolveInventoryRuntime, LIVE_INVENTORY_ACTIVATION_VALUE } from "../src/lib/inventory-runtime";
import { buildOrrProviderSnapshot } from "../src/lib/orr-inventory-provider-adapter";
import type { InventoryProviderSnapshot } from "../src/lib/inventory-provider-contract";
import type { OrrAlgoliaDiscovery, OrrAlgoliaHit } from "../src/lib/orr-public-algolia";

const fetchedAt = "2026-09-14T18:00:00.000Z";

function hit(overrides: Partial<OrrAlgoliaHit> = {}): OrrAlgoliaHit {
  return {
    objectID: "obj-1",
    dealer_id: 2175,
    vin: "1N4BL4DV9SN320880",
    stock_number: "320880P",
    make_year: "2026.5",
    make: "Nissan",
    model: "Rogue",
    car_trim: "SV",
    price: 29995,
    msrp: 31500,
    odometer: 12,
    car_condition: "New",
    category: "SUV",
    drivetrain: "AWD",
    exterior_color: "Gun Metallic",
    parsed_features: ["Apple CarPlay"],
    images: ["https://example.com/rogue-1.jpg"],
    is_active: true,
    archived: false,
    on_hold: false,
    ...overrides,
  };
}

function discovery(hits: OrrAlgoliaHit[], at = fetchedAt, sourceHash = "snapshot-hash-1"): OrrAlgoliaDiscovery {
  return {
    sourceUrl: "https://orrnissanwest.com/inventory",
    sourceHash,
    fetchedAt: at,
    indexName: "production-inventory-global_price_desc",
    dealerId: 2175,
    hits,
    reportedHitCount: hits.length,
    pagesFetched: 1,
    completeSnapshot: true,
  };
}

const first = buildOrrProviderSnapshot(discovery([hit()]));
assert.equal(first.providerId, "ridemotive-algolia");
assert.equal(first.dealershipId, "2175");
assert.equal(first.records.length, 1);
assert.equal(first.records[0].modelYear, "2026.5");
assert.equal(first.records[0].exteriorColor, "Gun Metallic");
assert.deepEqual(first.records[0].features, ["Apple CarPlay"]);
assert.deepEqual(first.records[0].sourcePhotos, [{ url: "https://example.com/rogue-1.jpg" }]);
assert.throws(() => buildOrrProviderSnapshot({ ...discovery([hit()]), dealerId: 9999 }), /ORR_PROVIDER_DEALER_BOUNDARY_MISMATCH/);
assert.throws(() => buildOrrProviderSnapshot({ ...discovery([hit()]), completeSnapshot: false }), /ORR_PROVIDER_SNAPSHOT_INCOMPLETE/);

const firstReconciled = reconcileInventoryProviderCurrentState({ previous: null, currentSnapshot: first });
assert.equal(firstReconciled.state.records[0]?.availabilityState, "active");

const cached = buildCachedCustomerInventory({
  state: firstReconciled.state,
  nowMs: Date.parse("2026-09-14T19:00:00.000Z"),
  maxAgeMs: 2 * 60 * 60 * 1000,
});
assert.equal(cached.eligibleForCustomerUse, true);
assert.equal(cached.customerVisibleLiveInventory, false);
assert.equal(cached.vehicles.length, 1);
assert.equal(cached.vehicles[0].id, "1N4BL4DV9SN320880");
assert.equal(cached.vehicles[0].year, 2026.5);
assert.equal(cached.vehicles[0].image, "https://example.com/rogue-1.jpg");
assert.equal(cached.vehicles[0].inTransit, false);
assert.equal(cached.rejected.length, 0);
assert.throws(
  () => buildCachedCustomerInventory({ state: firstReconciled.state, nowMs: Date.parse("2026-09-15T06:00:00.000Z"), maxAgeMs: 2 * 60 * 60 * 1000 }),
  /INVENTORY_CACHE_STALE/,
);

const inTransitSnapshot = buildOrrProviderSnapshot(discovery([
  hit({
    objectID: "obj-transit",
    vin: "5N1DR3DF7SC222222",
    stock_number: "222222T",
    in_transit: true,
  }),
], "2026-09-14T18:30:00.000Z", "snapshot-hash-transit"));
const inTransitState = reconcileInventoryProviderCurrentState({ previous: null, currentSnapshot: inTransitSnapshot });
const inTransitCached = buildCachedCustomerInventory({
  state: inTransitState.state,
  nowMs: Date.parse("2026-09-14T19:00:00.000Z"),
  maxAgeMs: 2 * 60 * 60 * 1000,
});
assert.equal(inTransitCached.vehicles.length, 1, "sellable in-transit inventory must remain customer-eligible");
assert.equal(inTransitCached.vehicles[0].id, "5N1DR3DF7SC222222");
assert.equal(inTransitCached.vehicles[0].inTransit, true);
assert.equal(inTransitCached.vehicles[0].sourceStockStatus, "In Transit");
assert.equal(inTransitCached.rejected.length, 0);

const coupeSnapshot = buildOrrProviderSnapshot(discovery([
  hit({
    objectID: "obj-coupe",
    vin: "1N4AA6EV0GC444444",
    stock_number: "444444C",
    model: "Z",
    car_trim: "Performance",
    category: "Coupe",
  }),
], "2026-09-14T18:45:00.000Z", "snapshot-hash-coupe"));
const coupeState = reconcileInventoryProviderCurrentState({ previous: null, currentSnapshot: coupeSnapshot });
const coupeCached = buildCachedCustomerInventory({
  state: coupeState.state,
  nowMs: Date.parse("2026-09-14T19:00:00.000Z"),
  maxAgeMs: 2 * 60 * 60 * 1000,
});
assert.equal(coupeCached.vehicles.length, 1, "source-supported body styles must not be discarded by cache normalization");
assert.equal(coupeCached.vehicles[0].type, "Coupe");
assert.equal(coupeCached.rejected.length, 0);

const inactiveRuntime = resolveInventoryRuntime({ mode: "live-enabled" });
assert.throws(() => buildProviderCachedCatalog({ runtime: inactiveRuntime, cached }), /INVENTORY_CACHE_RUNTIME_NOT_ACTIVATED/);
const activeRuntime = resolveInventoryRuntime({ mode: "live-enabled", liveActivation: LIVE_INVENTORY_ACTIVATION_VALUE });
const catalog = buildProviderCachedCatalog({ runtime: activeRuntime, cached, generatedAt: "2026-09-14T19:00:00.000Z" });
assert.equal(catalog.source, "provider-cache");
assert.equal(catalog.customerVisibleLiveInventory, true);
assert.equal(catalog.vehicles[0].year, 2026.5);
assert.equal(catalog.sourceEvidence?.providerId, "ridemotive-algolia");

const changed = buildOrrProviderSnapshot(discovery([hit({ price: 28995, odometer: 20 })], "2026-09-14T19:00:00.000Z", "snapshot-hash-2"));
assert.doesNotThrow(() => assertForwardSnapshotSequence(first, changed));
assert.throws(() => assertForwardSnapshotSequence(changed, first), /INVENTORY_SYNC_TIME_ROLLBACK/);
assert.throws(() => assertForwardSnapshotSequence(first, { ...first, sourceHash: "different-hash" }), /INVENTORY_SYNC_SAME_TIME_SOURCE_COLLISION/);
const changedState = reconcileInventoryProviderCurrentState({ previous: firstReconciled.state, currentSnapshot: changed });
assert.equal(changedState.changes[0]?.type, "UPDATED");
if (changedState.changes[0]?.type === "UPDATED") {
  assert.deepEqual(changedState.changes[0].changedFields.sort(), ["mileage", "price"]);
}

const emptyOnce: InventoryProviderSnapshot = {
  ...first,
  fetchedAt: "2026-09-14T20:00:00.000Z",
  sourceHash: "snapshot-hash-3",
  records: [],
};
const missingOnce = reconcileInventoryProviderCurrentState({ previous: firstReconciled.state, currentSnapshot: emptyOnce });
assert.equal(missingOnce.changes[0]?.type, "MISSING_ONCE");
assert.equal(missingOnce.state.records[0]?.availabilityState, "missing-once");
const missingRead = buildCachedCustomerInventory({ state: missingOnce.state, nowMs: Date.parse("2026-09-14T20:30:00.000Z") });
assert.equal(missingRead.vehicles.length, 0);
assert.deepEqual(missingRead.rejected, [{ vin: "1N4BL4DV9SN320880", reason: "availability:missing-once" }]);

const emptyTwice: InventoryProviderSnapshot = {
  ...emptyOnce,
  fetchedAt: "2026-09-14T21:00:00.000Z",
  sourceHash: "snapshot-hash-4",
};
const missingRepeatedly = reconcileInventoryProviderCurrentState({ previous: missingOnce.state, currentSnapshot: emptyTwice });
assert.equal(missingRepeatedly.changes[0]?.type, "MISSING_REPEATEDLY");
assert.equal(missingRepeatedly.state.records[0]?.availabilityState, "missing-repeatedly");

const returned = buildOrrProviderSnapshot(discovery([hit()], "2026-09-14T22:00:00.000Z", "snapshot-hash-5"));
const returnedState = reconcileInventoryProviderCurrentState({ previous: missingRepeatedly.state, currentSnapshot: returned });
assert.equal(returnedState.state.records[0]?.availabilityState, "active");
assert.equal(returnedState.changes[0]?.type, "UPDATED");
if (returnedState.changes[0]?.type === "UPDATED") assert.ok(returnedState.changes[0].changedFields.includes("availabilityState"));

console.log("PASS_PROVIDER_NEUTRAL_INVENTORY_CACHE_BOUNDARIES");
