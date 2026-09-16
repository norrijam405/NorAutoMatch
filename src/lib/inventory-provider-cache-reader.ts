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
  const sourceValue = value?.trim();
  if (!sourceValue) return undefined;
  const text = sourceValue.toLowerCase();
  if (text.includes("suv") || text.includes("crossover")) return "SUV";
  if (text.includes("truck") || text.includes("pickup")) return "Truck";
  if (text.includes("sedan")) return "Sedan";
  return sourceValue;
}

function recordToVehicle(record: InventoryProviderRecord): Vehicle | undefined {
  if (record.availabilityState !== "active" && record.availabilityState !== "observed") return undefined;

  const year = Number(record.modelYear);
  const type = normalizeBodyType(record.bodyType);
  if (!Number.isFinite(year) || !record.make.trim() || !record.model.trim() || !record.trim?.trim() || !record.price || !type) return undefined;

  return {
    id: record.vin,
    year,
    make: record.make,
    model: record.model,
    trim: record.trim,
    price: record.price,
    type,
    mileage: record.mileage ?? 0,
    drivetrain: record.drivetrain ?? "Unknown",
    image: record.sourcePhotos[0]?.url ?? "/images/vehicle-placeholder.jpg",
    accent: record.exteriorColor ?? "Color unavailable",
    condition: record.condition,
    exteriorColor: record.exteriorColor,
    interiorColor: record.interiorColor,
    features: record.features,
    transmission: record.transmission,
    engine: record.engine,
    fuelType: record.fuelType,
    cityMpg: record.cityMpg,
    highwayMpg: record.highwayMpg,
    inTransit: record.inTransit === true,
    sourceStockStatus: record.inTransit === true ? "In Transit" : "Available",
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
