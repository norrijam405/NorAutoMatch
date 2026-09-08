import { isMatchEligible, qualifyFreshness, type LiveInventoryRecord } from "./live-inventory";
import type { Vehicle } from "./inventory";

export type InventoryMode = "demo" | "live-shadow" | "live-enabled";

export type InventoryBridgeResult = {
  mode: InventoryMode;
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

export function liveRecordToVehicle(record: LiveInventoryRecord): Vehicle | undefined {
  const type = normalizeBodyType(record.bodyType);
  if (
    !isMatchEligible(record) ||
    record.inTransit === true ||
    !record.year ||
    !record.make ||
    !record.model ||
    !record.trim ||
    !record.price ||
    !type
  ) {
    return undefined;
  }

  return {
    id: record.vin,
    year: record.year,
    make: record.make,
    model: record.model,
    trim: record.trim,
    price: record.price,
    type,
    mileage: record.mileage ?? 0,
    drivetrain: record.drivetrain ?? "Unknown",
    image: record.photos?.[0] ?? "/images/vehicle-placeholder.jpg",
    accent: record.exteriorColor ?? "Color unavailable",
  };
}

export function selectInventoryForMatcher(input: {
  mode: InventoryMode;
  demoInventory: Vehicle[];
  liveRecords: LiveInventoryRecord[];
  nowMs?: number;
}): InventoryBridgeResult {
  if (input.mode !== "live-enabled") {
    return { mode: input.mode, vehicles: input.demoInventory, rejected: [] };
  }

  const rejected: Array<{ vin: string; reason: string }> = [];
  const vehicles: Vehicle[] = [];

  for (const raw of input.liveRecords) {
    const record = qualifyFreshness(raw, input.nowMs);
    if (record.inTransit === true) {
      rejected.push({ vin: raw.vin, reason: "source_status:in_transit" });
      continue;
    }
    const vehicle = liveRecordToVehicle(record);
    if (!vehicle) {
      rejected.push({ vin: raw.vin, reason: `not_match_eligible:${record.availabilityState}` });
      continue;
    }
    vehicles.push(vehicle);
  }

  return { mode: input.mode, vehicles, rejected };
}
