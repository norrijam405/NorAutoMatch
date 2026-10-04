import { normalizeOrrAlgoliaDiscovery, normalizeOrrAlgoliaHit } from "../src/lib/orr-algolia-normalizer";
import { reconcileOrrAlgoliaSnapshot } from "../src/lib/orr-algolia-sync";
import type { LiveInventoryRecord } from "../src/lib/live-inventory";
import type { OrrAlgoliaDiscovery, OrrAlgoliaHit } from "../src/lib/orr-public-algolia";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const fetchedAt = "2026-09-08T18:00:00.000Z";

function hit(overrides: Partial<OrrAlgoliaHit> = {}): OrrAlgoliaHit {
  return {
    objectID: "2901388",
    id: 2901388,
    dealer_id: 2175,
    dealer_ids: [2175],
    dealership: "Orr Nissan West",
    vin: "JN8AY3CC1T9230283",
    stock_number: "T9230283",
    make_year: 2026,
    make: "Nissan",
    model: "Armada",
    car_trim: "Platinum Reserve",
    price: 84179,
    msrp: 88780,
    odometer: 0,
    car_condition: "New",
    category: "SUV",
    body_subtype: "4D Sport Utility",
    drivetrain: "4X4",
    engine: "3.5L Twin Turbo V6",
    transmission: "Automatic",
    standardized_fuel_type: "Gasoline",
    exterior_color: "White Pearl",
    interior_color: "Steel",
    city_mpg: 16,
    highway_mpg: 19,
    parsed_features: ["Power Seats", "Tow Hitch"],
    rebate_price: 3500,
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

function previous(overrides: Partial<LiveInventoryRecord> = {}): LiveInventoryRecord {
  const normalized = normalizeOrrAlgoliaHit(hit(), "2026-09-08T17:45:00.000Z").record!;
  return { ...normalized, ...overrides };
}

function run() {
  const good = normalizeOrrAlgoliaHit(hit(), fetchedAt);
  assert(good.record, "Valid dealer hit should normalize.");
  assert(good.record.year === 2026, "make_year should normalize to year.");
  assert(good.record.trim === "Platinum Reserve", "car_trim should normalize to trim.");
  assert(good.record.mileage === 0, "odometer should normalize to mileage.");
  assert(good.record.bodyType === "SUV", "category should normalize to body type.");
  assert(good.record.features?.includes("Tow Hitch"), "parsed features should normalize.");
  assert(good.record.sourceStockStatus === "in_stock" && good.record.inTransit === false, "In-stock source truth should be preserved.");

  assert(normalizeOrrAlgoliaHit(hit({ dealer_id: 999 }), fetchedAt).issue?.code === "DEALER_MISMATCH", "Wrong dealer must fail closed.");
  assert(normalizeOrrAlgoliaHit(hit({ vin: "BADVIN" }), fetchedAt).issue?.code === "VIN_INVALID", "Invalid VIN must fail closed.");
  assert(normalizeOrrAlgoliaHit(hit({ price: 0, functional_price: 0 }), fetchedAt).issue?.code === "PRICE_INVALID", "Zero advertised and functional price must fail closed.");
  assert(normalizeOrrAlgoliaHit(hit({ is_active: false }), fetchedAt).issue?.code === "INACTIVE_HIT", "Inactive hit must not normalize as active inventory.");

  const fallback = normalizeOrrAlgoliaHit(hit({ price: 0, functional_price: 79950 }), fetchedAt);
  assert(fallback.record?.price === 79950, "Positive functional price must be accepted when primary price is non-positive.");

  const transitByStatus = normalizeOrrAlgoliaHit(hit({ stock_status: "in_transit", in_transit: false }), fetchedAt);
  assert(transitByStatus.record?.sourceStockStatus === "in_transit" && transitByStatus.record.inTransit === true, "Source stock_status=in_transit must preserve transit truth even when boolean flag disagrees.");

  const transitByFlag = normalizeOrrAlgoliaHit(hit({ stock_status: "in_stock", in_transit: true }), fetchedAt);
  assert(transitByFlag.record?.inTransit === true, "Explicit in_transit=true must preserve transit truth even when stock_status disagrees.");

  const noStock = normalizeOrrAlgoliaHit(hit({ stock_number: undefined }), fetchedAt);
  assert(noStock.record?.vin === "JN8AY3CC1T9230283", "Valid VIN unit must survive missing source stock number.");
  assert(noStock.record?.stockNumber === undefined, "Missing stock number must remain absent, not fabricated.");
  assert(noStock.issue?.code === "STOCK_NUMBER_MISSING" && noStock.issue.severity === "WARNING", "Missing stock number must remain auditable as a warning.");

  const duplicate = normalizeOrrAlgoliaDiscovery(discovery([hit(), hit({ objectID: "other" })]));
  assert(duplicate.records.length === 1, "Duplicate VIN must not create duplicate inventory records.");
  assert(duplicate.issues.some((issue) => issue.code === "DUPLICATE_VIN"), "Duplicate VIN must emit an issue.");

  const base = previous();
  const changed = reconcileOrrAlgoliaSnapshot({
    previousRecords: [base],
    discovery: discovery([hit({ price: 79999 })]),
    nowMs: Date.parse(fetchedAt),
  });
  assert(changed.records[0].price === 79999, "Price change must update current observation.");
  assert(changed.events.some((event) => event.type === "PRICE_CHANGED"), "Price change must emit append-only event.");
  assert(changed.records[0].firstSeenAt === base.firstSeenAt, "Re-observation must preserve firstSeenAt.");

  const transitChange = reconcileOrrAlgoliaSnapshot({
    previousRecords: [base],
    discovery: discovery([hit({ stock_status: "in_transit", in_transit: true })]),
    nowMs: Date.parse(fetchedAt),
  });
  assert(transitChange.records[0].inTransit === true, "Reconciliation must retain new transit state.");
  assert(transitChange.events.some((event) => event.type === "SOURCE_STOCK_STATUS_CHANGED"), "Stock status transition must emit evidence event.");
  assert(transitChange.events.some((event) => event.type === "IN_TRANSIT_CHANGED"), "Transit transition must emit evidence event.");

  const missingStockSync = reconcileOrrAlgoliaSnapshot({
    previousRecords: [base],
    discovery: discovery([hit({ stock_number: undefined })]),
    nowMs: Date.parse(fetchedAt),
  });
  assert(missingStockSync.records.length === 1, "Missing stock number warning must not remove the VIN record.");
  assert(missingStockSync.records[0].availabilityState === "ACTIVE_CURRENT", "Warning-only observation must remain current.");
  assert(missingStockSync.records[0].stockNumber === undefined, "Current observation must reflect absent stock number without fabrication.");
  assert(missingStockSync.records[0].consecutiveHealthyMisses === 0, "Warning-only observation must reset healthy misses.");

  const missing = reconcileOrrAlgoliaSnapshot({ previousRecords: [base], discovery: discovery([]), nowMs: Date.parse(fetchedAt) });
  assert(missing.records[0].availabilityState === "MISSING_PENDING", "First complete-snapshot absence must remain pending.");

  const malformedSameVin = reconcileOrrAlgoliaSnapshot({
    previousRecords: [base],
    discovery: discovery([hit({ price: 0, functional_price: 0 })]),
    nowMs: Date.parse(fetchedAt),
  });
  assert(malformedSameVin.records.length === 1, "Malformed observed VIN must preserve the prior record instead of disappearing.");
  assert(malformedSameVin.records[0].availabilityState === "SOURCE_ERROR", "Malformed observed VIN must be blocked as SOURCE_ERROR.");
  assert(malformedSameVin.records[0].consecutiveHealthyMisses === 0, "Malformed hit must not increment healthy misses.");
  assert(malformedSameVin.records[0].price === base.price, "Malformed hit must not overwrite the last trusted price.");

  let incompleteBlocked = false;
  try {
    reconcileOrrAlgoliaSnapshot({ previousRecords: [base], discovery: discovery([], { completeSnapshot: false, reportedHitCount: 1 }) });
  } catch {
    incompleteBlocked = true;
  }
  assert(incompleteBlocked, "Partial dealer snapshot must not advance inventory state.");

  console.log("PASS Orr Algolia normalization, price fallback, transit, and reconciliation invariants");
}

run();
