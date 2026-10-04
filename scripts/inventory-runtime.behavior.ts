import { LIVE_INVENTORY_ACTIVATION_VALUE, resolveInventoryRuntime, selectCustomerInventory } from "../src/lib/inventory-runtime";
import type { Vehicle } from "../src/lib/inventory";
import type { LiveInventoryRecord } from "../src/lib/live-inventory";

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
    source: "orrnissanwest_public_algolia",
    sourceUrl: "https://orrnissanwest.com/inventory",
    vin: "5N1BT3BA8TC882931",
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
    firstSeenAt: "2026-09-08T18:00:00.000Z",
    lastSeenAt: "2026-09-08T18:00:00.000Z",
    fetchedAt: "2026-09-08T18:00:00.000Z",
    sourceHash: "a".repeat(64),
    parserVersion: "orr-algolia-v3",
    consecutiveHealthyMisses: 0,
    ...overrides,
  };
}

function run() {
  const defaulted = resolveInventoryRuntime({});
  assert(defaulted.effectiveMode === "demo", "Missing mode must default to demo.");
  assert(defaulted.customerVisibleLiveInventory === false, "Default mode must never expose live inventory.");

  const invalid = resolveInventoryRuntime({ mode: "YOLO" });
  assert(invalid.effectiveMode === "demo", "Invalid mode must fail closed to demo.");
  assert(invalid.reason === "INVALID_MODE_DEFAULTED_TO_DEMO", "Invalid mode must remain auditable.");

  const shadow = resolveInventoryRuntime({ mode: "live-shadow" });
  const shadowCatalog = selectCustomerInventory({ runtime: shadow, demoInventory: demo, liveRecords: [live()], nowMs: Date.parse("2026-09-08T18:05:00.000Z") });
  assert(shadowCatalog.vehicles.length === 1 && shadowCatalog.vehicles[0].id === "demo-1", "Shadow mode must keep customer-visible inventory on demo data.");

  const blockedLive = resolveInventoryRuntime({ mode: "live-enabled" });
  assert(blockedLive.effectiveMode === "demo", "Live request without activation token must fail closed to demo.");
  assert(blockedLive.reason === "LIVE_ACTIVATION_MISSING", "Missing live activation must be explicit.");

  const liveRuntime = resolveInventoryRuntime({ mode: "live-enabled", liveActivation: LIVE_INVENTORY_ACTIVATION_VALUE });
  assert(liveRuntime.effectiveMode === "live-enabled", "Exact activation boundary should permit live-enabled mode.");
  assert(liveRuntime.customerVisibleLiveInventory === true, "Activated live mode should declare customer-visible live inventory.");

  const activated = selectCustomerInventory({
    runtime: liveRuntime,
    demoInventory: demo,
    liveRecords: [live(), live({ vin: "5N1BT3BB8TC896000", inTransit: true })],
    nowMs: Date.parse("2026-09-08T18:05:00.000Z"),
  });
  assert(activated.vehicles.length === 1 && activated.vehicles[0].id === "5N1BT3BA8TC882931", "Activated live catalog must include only eligible current non-transit units.");
  assert(activated.rejected.some((item) => item.vin === "5N1BT3BB8TC896000" && item.reason === "source_status:in_transit"), "Transit exclusion must stay auditable.");

  const emptyLive = selectCustomerInventory({ runtime: liveRuntime, demoInventory: demo, liveRecords: [], nowMs: Date.parse("2026-09-08T18:05:00.000Z") });
  assert(emptyLive.vehicles.length === 0, "Activated live mode must not silently fall back to demo inventory when live data is empty.");

  console.log("PASS inventory runtime activation and fail-closed invariants");
}

run();
