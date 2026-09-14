import type { Pool } from "pg";
import type { Vehicle } from "./inventory";
import type { InventoryProviderRecord, InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";
import { loadLatestInventoryProviderSnapshot } from "./inventory-provider-cache-store";

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
  if (text.includes("suv") || text.includes("crossover")) return "SUV";
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
  };
}

export function buildCachedCustomerInventory(input: {
  snapshot: InventoryProviderSnapshot;
  nowMs?: number;
  maxAgeMs?: number;
}): CachedInventoryReadResult {
  const snapshot = assertProviderSnapshotBoundary(input.snapshot);
  const nowMs = input.nowMs ?? Date.now();
  const fetchedMs = Date.parse(snapshot.fetchedAt);
  const maxAgeMs = input.maxAgeMs ?? 6 * 60 * 60 * 1000;

  if (!Number.isFinite(fetchedMs)) throw new Error("INVENTORY_CACHE_FETCHED_AT_INVALID");
  if (maxAgeMs <= 0) throw new Error("INVENTORY_CACHE_MAX_AGE_INVALID");

  const snapshotAgeMs = nowMs - fetchedMs;
  if (snapshotAgeMs < 0) throw new Error("INVENTORY_CACHE_SNAPSHOT_FROM_FUTURE");
  if (snapshotAgeMs > maxAgeMs) throw new Error("INVENTORY_CACHE_STALE");

  const vehicles: Vehicle[] = [];
  const rejected: Array<{ vin: string; reason: string }> = [];
  for (const record of snapshot.records) {
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
    providerId: snapshot.providerId,
    dealershipId: snapshot.dealershipId,
    sourceUrl: snapshot.sourceUrl,
    fetchedAt: snapshot.fetchedAt,
    sourceHash: snapshot.sourceHash,
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
  const snapshot = await loadLatestInventoryProviderSnapshot({
    pool: input.pool,
    providerId: input.providerId,
    dealershipId: input.dealershipId,
  });
  if (!snapshot) throw new Error("INVENTORY_CACHE_EMPTY");
  return buildCachedCustomerInventory({ snapshot, nowMs: input.nowMs, maxAgeMs: input.maxAgeMs });
}
