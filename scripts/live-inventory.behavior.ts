import {
  applyHealthyAbsence,
  applyHealthyObservation,
  applySourceError,
  diffInventoryRecord,
  isMatchEligible,
  nextRefreshDelayMs,
  qualifyFreshness,
  shouldAccelerateRefresh,
  DEFAULT_REFRESH_POLICY,
  type LiveInventoryRecord,
} from "../src/lib/live-inventory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(overrides: Partial<LiveInventoryRecord> = {}): LiveInventoryRecord {
  return {
    source: "orrnissanwest_public",
    sourceUrl: "https://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931",
    sourceVehicleId: "5N1BT3BA8TC882931",
    vin: "5N1BT3BA8TC882931",
    stockNumber: "882931",
    year: 2026,
    make: "Nissan",
    model: "Rogue",
    trim: "SV",
    condition: "New",
    price: 31500,
    msrp: 34000,
    mileage: 12,
    incentives: ["Customer Cash: $1,000"],
    availabilityState: "ACTIVE_CURRENT",
    firstSeenAt: "2026-09-08T15:00:00.000Z",
    lastSeenAt: "2026-09-08T15:00:00.000Z",
    fetchedAt: "2026-09-08T15:00:00.000Z",
    sourceHash: "a".repeat(64),
    parserVersion: "orr-public-v1",
    consecutiveHealthyMisses: 0,
    ...overrides,
  };
}

function run() {
  const base = record();

  const priceChanged = record({ price: 30995, fetchedAt: "2026-09-08T15:05:00.000Z", sourceHash: "b".repeat(64) });
  const priceEvents = diffInventoryRecord(base, priceChanged);
  assert(priceEvents.some((event) => event.type === "PRICE_CHANGED" && event.previousValue === 31500 && event.newValue === 30995), "Price change event was not preserved.");

  const firstMiss = applyHealthyAbsence(base, "2026-09-08T15:15:00.000Z");
  assert(firstMiss.availabilityState === "MISSING_PENDING", "First healthy absence must not mark a unit removed.");
  assert(firstMiss.consecutiveHealthyMisses === 1, "First healthy absence should increment miss count to one.");

  const secondMiss = applyHealthyAbsence(firstMiss, "2026-09-08T15:20:00.000Z");
  assert(secondMiss.availabilityState === "REMOVED_CONFIRMED", "Second healthy absence should confirm removal under the default policy.");
  assert(secondMiss.consecutiveHealthyMisses === 2, "Second healthy absence should increment miss count to two.");

  const sourceError = applySourceError(firstMiss, "2026-09-08T15:16:00.000Z");
  assert(sourceError.availabilityState === "SOURCE_ERROR", "Source failure must surface as SOURCE_ERROR.");
  assert(sourceError.consecutiveHealthyMisses === 1, "Source failure must not increment healthy-miss count.");

  const reobserved = applyHealthyObservation(firstMiss, {
    source: base.source,
    sourceUrl: base.sourceUrl,
    sourceVehicleId: base.sourceVehicleId,
    vin: base.vin,
    stockNumber: base.stockNumber,
    year: base.year,
    make: base.make,
    model: base.model,
    trim: base.trim,
    condition: base.condition,
    price: base.price,
    msrp: base.msrp,
    mileage: base.mileage,
    incentives: base.incentives,
    fetchedAt: "2026-09-08T15:17:00.000Z",
    sourceHash: "c".repeat(64),
    parserVersion: base.parserVersion,
  });
  assert(reobserved.availabilityState === "ACTIVE_CURRENT", "Healthy re-observation must restore ACTIVE_CURRENT.");
  assert(reobserved.consecutiveHealthyMisses === 0, "Healthy re-observation must reset miss count.");
  assert(reobserved.firstSeenAt === base.firstSeenAt, "Healthy re-observation must preserve firstSeenAt.");
  assert(diffInventoryRecord(firstMiss, reobserved).some((event) => event.type === "VEHICLE_REAPPEARED"), "Reappearance event was not emitted.");

  const stale = qualifyFreshness(base, Date.parse("2026-09-08T15:31:00.000Z"));
  assert(stale.availabilityState === "ACTIVE_STALE", "Expired freshness must become ACTIVE_STALE.");
  assert(!isMatchEligible(stale), "Stale unit must not be match eligible.");
  assert(isMatchEligible(base), "Fresh ACTIVE_CURRENT unit should remain match eligible.");

  const reorderedIncentives = record({ incentives: ["ORR Discount: $500", "Customer Cash: $1,000"] });
  const reorderedIncentives2 = record({ incentives: ["Customer Cash: $1,000", "ORR Discount: $500"] });
  assert(!diffInventoryRecord(reorderedIncentives, reorderedIncentives2).some((event) => event.type === "INCENTIVE_CHANGED"), "Pure incentive ordering must not create a false change event.");

  assert(shouldAccelerateRefresh({ recentlyChanged: false, newlyObserved: false, tiedToActiveLead: true, shortlisted: false, appointmentPending: false, deskPrepActive: false }), "Active lead should accelerate refresh.");
  assert(!shouldAccelerateRefresh({ recentlyChanged: false, newlyObserved: false, tiedToActiveLead: false, shortlisted: false, appointmentPending: false, deskPrepActive: false }), "Idle unit should not accelerate refresh.");
  assert(nextRefreshDelayMs(false) === DEFAULT_REFRESH_POLICY.normalRefreshMs, "Normal refresh delay mismatch.");
  assert(nextRefreshDelayMs(true) === DEFAULT_REFRESH_POLICY.acceleratedRefreshMs, "Accelerated refresh delay mismatch.");

  console.log("PASS live inventory behavioral invariants");
}

run();
