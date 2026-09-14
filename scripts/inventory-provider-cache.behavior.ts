import assert from "node:assert/strict";
import { buildOrrProviderSnapshot } from "../src/lib/orr-inventory-provider-adapter";
import { diffInventorySnapshots } from "../src/lib/inventory-snapshot-diff";
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

function discovery(hits: OrrAlgoliaHit[]): OrrAlgoliaDiscovery {
  return {
    sourceUrl: "https://orrnissanwest.com/inventory",
    sourceHash: "snapshot-hash-1",
    fetchedAt,
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

const changed = buildOrrProviderSnapshot({
  ...discovery([hit({ price: 28995, odometer: 20 })]),
  sourceHash: "snapshot-hash-2",
  fetchedAt: "2026-09-14T19:00:00.000Z",
});
const changedDiff = diffInventorySnapshots(first, changed);
assert.equal(changedDiff.changes.length, 1);
assert.equal(changedDiff.changes[0].type, "UPDATED");
if (changedDiff.changes[0].type === "UPDATED") {
  assert.deepEqual(changedDiff.changes[0].changedFields.sort(), ["mileage", "price"]);
}

const emptySnapshot: InventoryProviderSnapshot = {
  ...first,
  fetchedAt: "2026-09-14T20:00:00.000Z",
  sourceHash: "snapshot-hash-3",
  records: [],
};
const missOnce = diffInventorySnapshots(first, emptySnapshot);
assert.equal(missOnce.changes[0].type, "MISSING_ONCE");
if (missOnce.changes[0].type === "MISSING_ONCE") assert.equal(missOnce.changes[0].current.availabilityState, "missing-once");

const priorMissing: InventoryProviderSnapshot = {
  ...first,
  sourceHash: "snapshot-hash-4",
  records: first.records.map((record) => ({ ...record, availabilityState: "missing-once" as const })),
};
const missRepeatedly = diffInventorySnapshots(priorMissing, emptySnapshot);
assert.equal(missRepeatedly.changes[0].type, "MISSING_REPEATEDLY");
if (missRepeatedly.changes[0].type === "MISSING_REPEATEDLY") assert.equal(missRepeatedly.changes[0].current.availabilityState, "missing-repeatedly");

console.log("PASS_PROVIDER_NEUTRAL_INVENTORY_CACHE_BOUNDARIES");
