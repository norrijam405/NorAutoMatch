import type { Pool } from "pg";
import type { Vehicle } from "./inventory";
import type { InventoryProviderRecord } from "./inventory-provider-contract";
import type { InventoryProviderCurrentState } from "./inventory-provider-current-state";
import { loadInventoryProviderCurrentState } from "./inventory-provider-cache-store";

export type CachedInventoryReadResult = {
  providerId: string;
  dealershipId: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceHash: string;
  snapshotAgeMs: number;
  eligibleForCustomerUse: true;
  customerVisibleLiveInventory: false;
  vehicles: Vehicle[];
  rejected: Array<{ vin: string; reason: string }>;
};

function normalizeBodyType(value?: string): Vehicle["type"] | undefined {
  if (!value) return undefined;
  const text = value.toLowerCase();
  if (text.includes("suv") || text.includes("crossover") || text.includes("station wagon")) return "SUV";
  if (text.includes("truck") || text.includes("pickup")) return "Truck";
  if (text.includes("sedan") || text.includes("car")) return "Sedan";
  return undefined;
}

function recordToVehicle(record: InventoryProviderRecord): Vehicle | undefined {
  if (record.availabilityState !== "active" && record.availabilityState !== "observed") return undefined;
  if (record.inTransit === true) return undefined;

  const year = Number(record.modelYear);
  const type = normalizeBodyType(record.bodyType);
  if (!Number.isFinite(year) || !record.make.trim() || !record.model.trim() || !record.trim?.trim() || !record.price || !type) return undefined;

  const photos = record.sourcePhotos.map((photo) => photo.url).filter(Boolean);

  return {
    id: record.vin,
    vin: record.vin,
    stockNumber: record.stockNumber,
    year,
    make: record.make,
    model: record.model,
    trim: record.trim,
    price: record.price,
    marketPrice: record.marketPrice,
    discountAmount: record.discountAmount,
    docFee: record.docFee,
    displayedDealerSubtotal: record.displayedDealerSubtotal,
    msrp: record.msrp,
    type,
    mileage: record.mileage ?? 0,
    drivetrain: record.drivetrain ?? "Unknown",
    image: photos[0] ?? "/images/vehicle-placeholder.jpg",
    photos: photos.length > 0 ? photos : undefined,
    vehicleUrl: record.vehicleUrl,
    accent: record.exteriorColor ?? "Color unavailable",
    condition: record.condition,
    exteriorColor: record.exteriorColor,
    interiorColor: record.interiorColor,
    features: record.features,
    transmission: record.transmission,
    engine: record.engine,
    horsepower: record.horsepower,
    doors: record.doors,
    fuelType: record.fuelType,
    cityMpg: record.cityMpg,
    highwayMpg: record.highwayMpg,
  };
}

export function buildCachedCustomerInventory(input: {
  state: InventoryProviderCurrentState;
  nowMs?: number;
  maxAgeMs?: number;
}): CachedInventoryReadResult {
  const state = input.state;
  if (!state.providerId.trim() || !state.dealershipId.trim() || !state.sourceUrl.trim() || !state.sourceHash.trim()) {
    throw new Error("INVENTORY_CACHE_STATE_IDENTITY_INCOMPLETE");
  }
  const nowMs = input.nowMs ?? Date.now();
  const fetchedMs = Date.parse(state.asOf);
  const maxAgeMs = input.maxAgeMs ?? 6 * 60 * 60 * 1000;

  if (!Number.isFinite(fetchedMs)) throw new Error("INVENTORY_CACHE_FETCHED_AT_INVALID");
  if (maxAgeMs <= 0) throw new Error("INVENTORY_CACHE_MAX_AGE_INVALID");

  const snapshotAgeMs = nowMs - fetchedMs;
  if (snapshotAgeMs < 0) throw new Error("INVENTORY_CACHE_SNAPSHOT_FROM_FUTURE");
  if (snapshotAgeMs > maxAgeMs) throw new Error("INVENTORY_CACHE_STALE");

  const vehicles: Vehicle[] = [];
  const rejected: Array<{ vin: string; reason: string }> = [];
  for (const record of state.records) {
    if (record.providerId !== state.providerId) throw new Error(`INVENTORY_CACHE_RECORD_PROVIDER_DRIFT:${record.vin}`);
    if (record.dealershipId !== state.dealershipId) throw new Error(`INVENTORY_CACHE_RECORD_DEALERSHIP_DRIFT:${record.vin}`);
    if (record.inTransit === true) {
      rejected.push({ vin: record.vin, reason: "source_status:in_transit" });
      continue;
    }
    if (record.availabilityState !== "active" && record.availabilityState !== "observed") {
      rejected.push({ vin: record.vin, reason: `availability:${record.availabilityState}` });
      continue;
    }
    const vehicle = recordToVehicle(record);
    if (!vehicle) {
      rejected.push({ vin: record.vin, reason: "customer_identity_incomplete" });
      continue;
    }
    vehicles.push(vehicle);
  }

  return {
    providerId: state.providerId,
    dealershipId: state.dealershipId,
    sourceUrl: state.sourceUrl,
    fetchedAt: state.asOf,
    sourceHash: state.sourceHash,
    snapshotAgeMs,
    eligibleForCustomerUse: true,
    customerVisibleLiveInventory: false,
    vehicles,
    rejected,
  };
}

export async function loadCachedCustomerInventory(input: {
  pool: Pool;
  providerId: string;
  dealershipId: string;
  nowMs?: number;
  maxAgeMs?: number;
}): Promise<CachedInventoryReadResult> {
  const state = await loadInventoryProviderCurrentState({
    pool: input.pool,
    providerId: input.providerId,
    dealershipId: input.dealershipId,
  });
  if (!state) throw new Error("INVENTORY_CACHE_EMPTY");
  return buildCachedCustomerInventory({ state, nowMs: input.nowMs, maxAgeMs: input.maxAgeMs });
}
