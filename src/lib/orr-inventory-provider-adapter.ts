import type { InventoryProviderAdapter, InventoryProviderRecord, InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";
import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import { discoverOrrAlgoliaInventory, type OrrAlgoliaDiscovery } from "./orr-public-algolia";

const PROVIDER_ID = "ridemotive-algolia";
const DEALERSHIP_ID = "2175";
const DEALERSHIP_NAME = "Orr Nissan West";

function mapRecord(record: ReturnType<typeof normalizeOrrAlgoliaDiscovery>["records"][number]): InventoryProviderRecord {
  return {
    providerId: PROVIDER_ID,
    dealershipId: DEALERSHIP_ID,
    dealershipName: DEALERSHIP_NAME,
    sourceUrl: record.sourceUrl,
    sourceRecordId: record.sourceVehicleId ?? record.vin,
    sourceFetchedAt: record.fetchedAt,
    sourceHash: record.sourceHash,
    vin: record.vin,
    stockNumber: record.stockNumber,
    modelYear: String(record.year),
    make: record.make,
    model: record.model,
    trim: record.trim,
    condition: record.condition,
    price: record.price,
    msrp: record.msrp,
    mileage: record.mileage,
    exteriorColor: record.exteriorColor,
    interiorColor: record.interiorColor,
    drivetrain: record.drivetrain,
    transmission: record.transmission,
    engine: record.engine,
    fuelType: record.fuelType,
    cityMpg: record.cityMpg,
    highwayMpg: record.highwayMpg,
    bodyType: record.bodyType,
    availabilityState: "active",
    inTransit: record.inTransit,
    features: record.features ?? [],
    sourcePhotos: (record.photos ?? []).map((url) => ({ url })),
  };
}

export function buildOrrProviderSnapshot(discovery: OrrAlgoliaDiscovery): InventoryProviderSnapshot {
  if (!discovery.completeSnapshot) throw new Error("ORR_PROVIDER_SNAPSHOT_INCOMPLETE");
  if (discovery.dealerId !== Number(DEALERSHIP_ID)) throw new Error("ORR_PROVIDER_DEALER_BOUNDARY_MISMATCH");

  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const fatalIssues = normalized.issues.filter((issue) => issue.severity === "ERROR");
  if (fatalIssues.length > 0) {
    throw new Error(`ORR_PROVIDER_NORMALIZATION_FAILED:${fatalIssues.map((issue) => issue.code).join(",")}`);
  }

  return assertProviderSnapshotBoundary({
    providerId: PROVIDER_ID,
    dealershipId: DEALERSHIP_ID,
    dealershipName: DEALERSHIP_NAME,
    authorized: true,
    fetchedAt: discovery.fetchedAt,
    sourceUrl: discovery.sourceUrl,
    sourceHash: discovery.sourceHash,
    records: normalized.records.map(mapRecord),
  });
}

export class OrrInventoryProviderAdapter implements InventoryProviderAdapter {
  readonly providerId = PROVIDER_ID;

  constructor(private readonly discover: () => Promise<OrrAlgoliaDiscovery> = () => discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 })) {}

  async fetchSnapshot(): Promise<InventoryProviderSnapshot> {
    return buildOrrProviderSnapshot(await this.discover());
  }
}
