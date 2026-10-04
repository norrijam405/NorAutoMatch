import { classifyLeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { InventoryCatalog } from "../src/lib/inventory-catalog";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const liveCatalog: InventoryCatalog = {
  requestedMode: "live-enabled",
  effectiveMode: "live-enabled",
  customerVisibleLiveInventory: true,
  runtimeReason: "LIVE_ACTIVATED",
  source: "orr-live",
  generatedAt: "2026-09-08T20:00:00.000Z",
  vehicles: [
    { id: "VIN1", year: 2026, make: "Nissan", model: "Rogue", trim: "SV", price: 30000, type: "SUV", mileage: 0, drivetrain: "FWD", image: "/x.jpg", accent: "White" },
  ],
  sourceEvidence: {
    dealerId: 2175,
    sourceUrl: "https://orrnissanwest.com/inventory",
    sourceHash: "a".repeat(64),
    fetchedAt: "2026-09-08T19:59:00.000Z",
    rawHitCount: 1,
    normalizedCount: 1,
    eligibleCount: 1,
    rejectedCount: 0,
    inTransitCount: 0,
    warningCount: 0,
    errorCount: 0,
  },
};

const demoCatalog: InventoryCatalog = {
  requestedMode: "demo",
  effectiveMode: "demo",
  customerVisibleLiveInventory: false,
  runtimeReason: "DEMO_REQUESTED",
  source: "demo",
  generatedAt: "2026-09-08T20:00:00.000Z",
  vehicles: [],
};

function run() {
  const none = classifyLeadInventoryEvidence({ shortlistedVehicleIds: [] });
  assert(none.state === "NO_SHORTLIST", "Empty shortlist should not manufacture evidence.");

  const demo = classifyLeadInventoryEvidence({ shortlistedVehicleIds: ["demo-1"], catalog: demoCatalog });
  assert(demo.state === "REPRESENTATIVE_ONLY", "Demo shortlist must never be described as verified live inventory.");
  assert(demo.verifiedVehicleIds.length === 0, "Demo IDs must not become verified IDs.");

  const verified = classifyLeadInventoryEvidence({ shortlistedVehicleIds: ["VIN1", "VIN1"], catalog: liveCatalog });
  assert(verified.state === "VERIFIED_LIVE", "Known live VIN should verify.");
  assert(verified.verifiedVehicleIds.length === 1, "Duplicate shortlisted IDs should deduplicate.");
  assert(verified.sourceHash === "a".repeat(64), "Live verification should preserve source receipt identity.");

  const partial = classifyLeadInventoryEvidence({ shortlistedVehicleIds: ["VIN1", "VIN_GONE"], catalog: liveCatalog });
  assert(partial.state === "PARTIALLY_VERIFIED_LIVE", "Unknown VIN mixed with known VIN must be explicit.");
  assert(partial.unverifiedVehicleIds[0] === "VIN_GONE", "Unknown VIN must remain auditable.");

  const unavailable = classifyLeadInventoryEvidence({ shortlistedVehicleIds: ["VIN1"], sourceUnavailable: true });
  assert(unavailable.state === "LIVE_SOURCE_UNAVAILABLE", "Source outage must not silently validate a VIN.");
  assert(unavailable.verifiedVehicleIds.length === 0, "Unavailable source cannot produce verified inventory evidence.");

  console.log("PASS lead inventory evidence invariants");
}

run();
