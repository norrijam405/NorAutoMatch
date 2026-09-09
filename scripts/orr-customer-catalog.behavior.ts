import { inventory as demoInventory } from "../src/lib/inventory";
import { LIVE_INVENTORY_ACTIVATION_VALUE } from "../src/lib/inventory-runtime";
import { loadOrrCustomerCatalog } from "../src/lib/orr-customer-catalog";
import type { OrrAlgoliaDiscovery, OrrAlgoliaHit } from "../src/lib/orr-public-algolia";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const fetchedAt = "2026-09-08T20:00:00.000Z";

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

async function expectSourceGateFailure(input: OrrAlgoliaDiscovery, reason: string) {
  let blocked = false;
  try {
    await loadOrrCustomerCatalog({
      mode: "live-enabled",
      liveActivation: LIVE_INVENTORY_ACTIVATION_VALUE,
      nowMs: Date.parse(fetchedAt),
      discover: async () => input,
    });
  } catch (error) {
    blocked = error instanceof Error && error.message.split(":").slice(1).join(":").split(",").includes(reason);
  }
  assert(blocked, `Activated live mode must fail closed on ${reason}.`);
}

async function run() {
  let discoveryCalls = 0;
  const shouldNotCall = async () => {
    discoveryCalls += 1;
    throw new Error("Live discovery should not run in demo/shadow mode.");
  };

  const demo = await loadOrrCustomerCatalog({ mode: "demo", discover: shouldNotCall, nowMs: Date.parse(fetchedAt) });
  assert(demo.source === "demo" && demo.vehicles.length === demoInventory.length, "Demo mode should return only demonstration inventory.");

  const shadow = await loadOrrCustomerCatalog({ mode: "live-shadow", discover: shouldNotCall, nowMs: Date.parse(fetchedAt) });
  assert(shadow.source === "demo" && shadow.customerVisibleLiveInventory === false, "Shadow mode must remain customer-visible demo inventory.");
  assert(discoveryCalls === 0, "Demo and shadow catalog loading must not call the live source on the customer request path.");

  const blocked = await loadOrrCustomerCatalog({ mode: "live-enabled", discover: shouldNotCall, nowMs: Date.parse(fetchedAt) });
  assert(blocked.source === "demo" && blocked.runtimeReason === "LIVE_ACTIVATION_MISSING", "Live mode without activation must fail closed to demo.");
  assert(discoveryCalls === 0, "Blocked live mode must not touch the live source.");

  let liveCalls = 0;
  const live = await loadOrrCustomerCatalog({
    mode: "live-enabled",
    liveActivation: LIVE_INVENTORY_ACTIVATION_VALUE,
    nowMs: Date.parse(fetchedAt),
    discover: async () => {
      liveCalls += 1;
      return discovery([
        hit(),
        hit({ objectID: "2", vin: "5N1BT3BB8TC896000", stock_number: undefined, stock_status: "in_transit", in_transit: true }),
        hit({ objectID: "3", vin: "KL79MTSL9NB065099", stock_number: "065099P", is_active: false }),
      ]);
    },
  });

  assert(liveCalls === 1, "Activated live mode should perform exactly one injected dealer discovery.");
  assert(live.source === "orr-live" && live.customerVisibleLiveInventory === true, "Activated live mode should produce an Orr live catalog.");
  assert(live.vehicles.length === 1 && live.vehicles[0].id === "5N1BT3BA8TC882931", "Only current non-transit eligible inventory may reach the customer catalog.");
  assert(live.sourceEvidence?.rawHitCount === 3, "Live catalog must preserve raw source count evidence.");
  assert(live.sourceEvidence?.normalizedCount === 2, "Inactive source rows must not normalize into active inventory.");
  assert(live.sourceEvidence?.inTransitCount === 1, "Transit count must remain explicit in source evidence.");
  assert(live.sourceEvidence?.warningCount === 1, "Missing stock number must remain a warning.");
  assert(live.sourceEvidence?.errorCount === 1, "Inactive row must remain an error/exclusion.");

  await expectSourceGateFailure(discovery([hit()], { reportedHitCount: 2, completeSnapshot: false }), "SNAPSHOT_INCOMPLETE");
  await expectSourceGateFailure(discovery([hit({ vin: undefined })]), "NORMALIZATION_ERROR_VIN_INVALID");
  await expectSourceGateFailure(discovery([hit({ price: 0, functional_price: 0 })]), "NORMALIZATION_ERROR_PRICE_INVALID");
  await expectSourceGateFailure(discovery([hit({ make: undefined })]), "NORMALIZATION_ERROR_IDENTITY_INCOMPLETE");
  await expectSourceGateFailure(discovery([hit({ is_active: false })]), "ZERO_NORMALIZED_INVENTORY");

  const warningAllowed = await loadOrrCustomerCatalog({
    mode: "live-enabled",
    liveActivation: LIVE_INVENTORY_ACTIVATION_VALUE,
    nowMs: Date.parse(fetchedAt),
    discover: async () => discovery([hit({ stock_number: undefined })]),
  });
  assert(warningAllowed.customerVisibleLiveInventory === true, "Non-blocking source warnings must not disable a healthy live catalog.");
  assert(warningAllowed.sourceEvidence?.warningCount === 1, "Allowed warning must remain visible in source evidence.");

  console.log("PASS Orr customer catalog source-isolation and source-gate invariants");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
