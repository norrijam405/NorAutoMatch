import type { InventoryProviderAdapter, InventoryProviderRecord, InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";
import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import {
  ORR_INVENTORY_DEALERSHIP_ID,
  ORR_INVENTORY_DEALERSHIP_NAME,
  ORR_INVENTORY_PROVIDER_ID,
} from "./orr-inventory-provider-identity";
import { discoverOrrAlgoliaInventory, type OrrAlgoliaDiscovery, type OrrAlgoliaHit } from "./orr-public-algolia";

const ORR_ORIGIN = "https://orrnissanwest.com";

function requiredIdentity(value: string | undefined, field: string, vin: string) {
  if (!value?.trim()) throw new Error(`ORR_PROVIDER_IDENTITY_INCOMPLETE:${field}:${vin}`);
  return value.trim();
}

function firstFiniteNumber(hit: OrrAlgoliaHit | undefined, keys: string[]) {
  if (!hit) return undefined;
  for (const key of keys) {
    const value = hit[key];
    const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value.replace(/[$,]/g, "")) : NaN;
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return undefined;
}

function firstOrrVehicleUrl(hit: OrrAlgoliaHit | undefined) {
  if (!hit) return undefined;
  const keys = ["vdp_url", "vehicle_url", "detail_url", "inventory_url", "permalink", "url"];
  for (const key of keys) {
    const value = hit[key];
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const parsed = new URL(value.trim(), ORR_ORIGIN);
      if (parsed.protocol === "https:" && parsed.origin === ORR_ORIGIN && parsed.pathname.startsWith("/inventory/")) {
        parsed.hash = "";
        return parsed.toString();
      }
    } catch {
      // Ignore malformed source URLs instead of inventing a replacement.
    }
  }
  return undefined;
}

function mapRecord(
  record: ReturnType<typeof normalizeOrrAlgoliaDiscovery>["records"][number],
  rawHit?: OrrAlgoliaHit,
): InventoryProviderRecord {
  const make = requiredIdentity(record.make, "make", record.vin);
  const model = requiredIdentity(record.model, "model", record.vin);

  return {
    providerId: ORR_INVENTORY_PROVIDER_ID,
    dealershipId: ORR_INVENTORY_DEALERSHIP_ID,
    dealershipName: ORR_INVENTORY_DEALERSHIP_NAME,
    sourceUrl: record.sourceUrl,
    sourceRecordId: record.sourceVehicleId ?? record.vin,
    sourceFetchedAt: record.fetchedAt,
    sourceHash: record.sourceHash,
    vin: record.vin,
    stockNumber: record.stockNumber,
    modelYear: String(record.year),
    make,
    model,
    trim: record.trim,
    condition: record.condition,
    price: record.price,
    marketPrice: firstFiniteNumber(rawHit, ["market_price", "marketPrice", "retail_price", "retailPrice"]),
    discountAmount: firstFiniteNumber(rawHit, ["discount_amount", "dealer_discount", "orr_discount", "discount"]),
    docFee: firstFiniteNumber(rawHit, ["doc_fee", "document_fee", "documentation_fee"]),
    displayedDealerSubtotal: firstFiniteNumber(rawHit, ["yor_price", "your_price", "internet_price", "sale_price"]),
    msrp: record.msrp,
    mileage: record.mileage,
    exteriorColor: record.exteriorColor,
    interiorColor: record.interiorColor,
    drivetrain: record.drivetrain,
    transmission: record.transmission,
    engine: record.engine,
    horsepower: firstFiniteNumber(rawHit, ["horsepower", "horse_power", "hp"]),
    doors: firstFiniteNumber(rawHit, ["doors", "door_count", "number_of_doors"]),
    fuelType: record.fuelType,
    cityMpg: record.cityMpg,
    highwayMpg: record.highwayMpg,
    bodyType: record.bodyType,
    availabilityState: "active",
    inTransit: record.inTransit,
    features: record.features ?? [],
    sourcePhotos: (record.photos ?? []).map((url) => ({ url })),
    vehicleUrl: firstOrrVehicleUrl(rawHit),
  };
}

export function buildOrrProviderSnapshot(discovery: OrrAlgoliaDiscovery): InventoryProviderSnapshot {
  if (!discovery.completeSnapshot) throw new Error("ORR_PROVIDER_SNAPSHOT_INCOMPLETE");
  if (discovery.dealerId !== Number(ORR_INVENTORY_DEALERSHIP_ID)) throw new Error("ORR_PROVIDER_DEALER_BOUNDARY_MISMATCH");

  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const fatalIssues = normalized.issues.filter((issue) => issue.severity === "ERROR");
  if (fatalIssues.length > 0) {
    throw new Error(`ORR_PROVIDER_NORMALIZATION_FAILED:${fatalIssues.map((issue) => issue.code).join(",")}`);
  }

  const rawByVin = new Map<string, OrrAlgoliaHit>();
  for (const hit of discovery.hits) {
    const vin = typeof hit.vin === "string" ? hit.vin.trim().toUpperCase() : undefined;
    if (vin && !rawByVin.has(vin)) rawByVin.set(vin, hit);
  }

  return assertProviderSnapshotBoundary({
    providerId: ORR_INVENTORY_PROVIDER_ID,
    dealershipId: ORR_INVENTORY_DEALERSHIP_ID,
    dealershipName: ORR_INVENTORY_DEALERSHIP_NAME,
    authorized: true,
    fetchedAt: discovery.fetchedAt,
    sourceUrl: discovery.sourceUrl,
    sourceHash: discovery.sourceHash,
    records: normalized.records.map((record) => mapRecord(record, rawByVin.get(record.vin))),
  });
}

export class OrrInventoryProviderAdapter implements InventoryProviderAdapter {
  readonly providerId = ORR_INVENTORY_PROVIDER_ID;

  constructor(private readonly discover: () => Promise<OrrAlgoliaDiscovery> = () => discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 })) {}

  async fetchSnapshot(): Promise<InventoryProviderSnapshot> {
    return buildOrrProviderSnapshot(await this.discover());
  }
}
