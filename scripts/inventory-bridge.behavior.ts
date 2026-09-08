import { selectInventoryForMatcher } from "../src/lib/inventory-bridge";
import type { LiveInventoryRecord } from "../src/lib/live-inventory";
import type { Vehicle } from "../src/lib/inventory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const demo: Vehicle[] = [{
  id: "demo-1",
  year: 2025,
  make: "Nissan",
  model: "Rogue",
  trim: "SV",
  price: 30000,
  type: "SUV",
  mileage: 10,
  drivetrain: "FWD",
  image: "/images/rogue.jpg",
  accent: "White",
}];

function live(overrides: Partial<LiveInventoryRecord> = {}): LiveInventoryRecord {
  return {
    source: "orrnissanwest_public",
    sourceUrl: "https://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931",
    vin: "5N1BT3BA8TC882931",
    sourceStockStatus: "in_stock",
    inTransit: false,
    year: 2026,
    make: "Nissan",
    model: "Rogue",
    trim: "SV",
    price: 31500,
    bodyType: "SUV",
    mileage: 12,
    drivetrain: "FWD",
    photos: ["/images/rogue.jpg"],
    exteriorColor: "Pearl White",
    availabilityState: "ACTIVE_CURRENT",
    firstSeenAt: "2026-09-08T17:00:00.000Z",
    lastSeenAt: "2026-09-08T17:00:00.000Z",
    fetchedAt: "2026-09-08T17:00:00.000Z",
    sourceHash: "a".repeat(64),
    parserVersion: "orr-public-v1",
    consecutiveHealthyMisses: 0,
    ...overrides,
  };
}

function run() {
  const shadow = selectInventoryForMatcher({ mode: "live-shadow", demoInventory: demo, liveRecords: [live()], nowMs: Date.parse("2026-09-08T17:05:00.000Z") });
  assert(shadow.vehicles[0].id === "demo-1", "Shadow mode must never replace customer-visible demo inventory.");

  const enabled = selectInventoryForMatcher({ mode: "live-enabled", demoInventory: demo, liveRecords: [live()], nowMs: Date.parse("2026-09-08T17:05:00.000Z") });
  assert(enabled.vehicles.length === 1 && enabled.vehicles[0].id === "5N1BT3BA8TC882931", "Fresh in-stock live unit should map into matcher inventory.");

  const transit = selectInventoryForMatcher({
    mode: "live-enabled",
    demoInventory: demo,
    liveRecords: [live({ sourceStockStatus: "in_transit", inTransit: true })],
    nowMs: Date.parse("2026-09-08T17:05:00.000Z"),
  });
  assert(transit.vehicles.length === 0, "In-transit unit must not masquerade as an on-lot matcher result.");
  assert(transit.rejected.length === 1 && transit.rejected[0].reason === "source_status:in_transit", "In-transit rejection must be explicit and auditable.");

  const staleTransit = selectInventoryForMatcher({
    mode: "live-enabled",
    demoInventory: demo,
    liveRecords: [live({ sourceStockStatus: "in_transit", inTransit: true })],
    nowMs: Date.parse("2026-09-08T17:31:00.000Z"),
  });
  assert(staleTransit.vehicles.length === 0, "Stale in-transit unit must remain blocked.");
  assert(staleTransit.rejected[0].reason === "source_status:in_transit", "Source transit truth must remain visible even when freshness also fails.");

  const stale = selectInventoryForMatcher({ mode: "live-enabled", demoInventory: demo, liveRecords: [live()], nowMs: Date.parse("2026-09-08T17:31:00.000Z") });
  assert(stale.vehicles.length === 0, "Stale live unit must fail closed.");
  assert(stale.rejected.length === 1, "Rejected stale unit should be auditable.");

  const incomplete = selectInventoryForMatcher({ mode: "live-enabled", demoInventory: demo, liveRecords: [live({ price: undefined })], nowMs: Date.parse("2026-09-08T17:05:00.000Z") });
  assert(incomplete.vehicles.length === 0, "Incomplete live unit must not enter matcher inventory.");

  console.log("PASS inventory bridge fail-closed and in-transit invariants");
}

run();
