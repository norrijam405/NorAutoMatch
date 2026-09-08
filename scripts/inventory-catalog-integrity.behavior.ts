import { verifyInventoryCatalogIntegrity } from "../src/lib/inventory-catalog-integrity";
import type { InventoryCatalog } from "../src/lib/inventory-catalog";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function baseCatalog(overrides: Partial<InventoryCatalog> = {}): InventoryCatalog {
  return {
    requestedMode: "live-enabled",
    effectiveMode: "live-enabled",
    customerVisibleLiveInventory: true,
    runtimeReason: "LIVE_ACTIVATED",
    source: "orr-live",
    generatedAt: "2026-09-08T20:30:00.000Z",
    vehicles: [{
      id: "5N1BT3BA8TC882931",
      year: 2026,
      make: "Nissan",
      model: "Rogue",
      trim: "SV",
      price: 31500,
      type: "SUV",
      mileage: 12,
      drivetrain: "FWD",
      image: "/images/vehicle-placeholder.jpg",
      accent: "Pearl White",
    }],
    sourceEvidence: {
      dealerId: 2175,
      sourceUrl: "https://orrnissanwest.com/inventory",
      sourceHash: "a".repeat(64),
      fetchedAt: "2026-09-08T20:29:00.000Z",
      rawHitCount: 1,
      normalizedCount: 1,
      eligibleCount: 1,
      rejectedCount: 0,
      inTransitCount: 0,
      warningCount: 0,
      errorCount: 0,
    },
    ...overrides,
  };
}

function hasCode(catalog: InventoryCatalog, code: string) {
  return verifyInventoryCatalogIntegrity(catalog).some((finding) => finding.code === code);
}

function run() {
  assert(verifyInventoryCatalogIntegrity(baseCatalog()).length === 0, "Valid live catalog should pass integrity checks.");

  assert(hasCode(baseCatalog({ customerVisibleLiveInventory: false }), "LIVE_SOURCE_WITHOUT_ACTIVATION"), "Live source without activation must fail integrity.");
  assert(hasCode(baseCatalog({ source: "demo" }), "LIVE_MODE_WITH_DEMO_SOURCE"), "Activated live mode must never silently present demo source.");

  const duplicate = baseCatalog();
  duplicate.vehicles = [...duplicate.vehicles, { ...duplicate.vehicles[0] }];
  duplicate.sourceEvidence = { ...duplicate.sourceEvidence!, eligibleCount: 2 };
  assert(hasCode(duplicate, "DUPLICATE_VEHICLE_ID"), "Duplicate VIN/customer id must fail integrity.");

  const badVin = baseCatalog();
  badVin.vehicles = [{ ...badVin.vehicles[0], id: "not-a-vin" }];
  assert(hasCode(badVin, "LIVE_ID_NOT_VIN"), "Live customer id must remain VIN-backed.");

  const zeroPrice = baseCatalog();
  zeroPrice.vehicles = [{ ...zeroPrice.vehicles[0], price: 0 }];
  assert(hasCode(zeroPrice, "NON_POSITIVE_PRICE"), "Zero-dollar live vehicle must fail integrity.");

  const countMismatch = baseCatalog();
  countMismatch.sourceEvidence = { ...countMismatch.sourceEvidence!, eligibleCount: 99 };
  assert(hasCode(countMismatch, "EVIDENCE_COUNT_MISMATCH"), "Evidence/customer count mismatch must fail integrity.");

  console.log("PASS customer inventory catalog integrity invariants");
}

run();
