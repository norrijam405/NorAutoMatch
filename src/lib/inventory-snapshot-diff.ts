import type { InventoryProviderRecord, InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";

export type InventorySnapshotChange =
  | { type: "ADDED"; vin: string; current: InventoryProviderRecord }
  | { type: "UPDATED"; vin: string; previous: InventoryProviderRecord; current: InventoryProviderRecord; changedFields: string[] }
  | { type: "MISSING_ONCE"; vin: string; previous: InventoryProviderRecord; current: InventoryProviderRecord }
  | { type: "MISSING_REPEATEDLY"; vin: string; previous: InventoryProviderRecord; current: InventoryProviderRecord }
  | { type: "UNCHANGED"; vin: string; current: InventoryProviderRecord };

export type InventorySnapshotDiff = {
  providerId: string;
  dealershipId: string;
  previousFetchedAt: string;
  currentFetchedAt: string;
  changes: InventorySnapshotChange[];
};

const MATERIAL_FIELDS: Array<keyof InventoryProviderRecord> = [
  "stockNumber", "modelYear", "make", "model", "trim", "condition", "price", "msrp", "mileage",
  "exteriorColor", "interiorColor", "drivetrain", "transmission", "engine", "fuelType", "cityMpg",
  "highwayMpg", "bodyType", "inTransit", "features", "sourcePhotos", "vehicleUrl",
];

function comparable(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

function missingTransition(previous: InventoryProviderRecord): InventoryProviderRecord {
  const nextState = previous.availabilityState === "missing-once" ? "missing-repeatedly" : "missing-once";
  return { ...previous, availabilityState: nextState };
}

export function diffInventorySnapshots(previousInput: InventoryProviderSnapshot, currentInput: InventoryProviderSnapshot): InventorySnapshotDiff {
  const previous = assertProviderSnapshotBoundary(previousInput);
  const current = assertProviderSnapshotBoundary(currentInput);
  if (previous.providerId !== current.providerId) throw new Error("INVENTORY_SNAPSHOT_PROVIDER_MISMATCH");
  if (previous.dealershipId !== current.dealershipId) throw new Error("INVENTORY_SNAPSHOT_DEALERSHIP_MISMATCH");

  const previousByVin = new Map(previous.records.map((record) => [record.vin.toUpperCase(), record]));
  const currentByVin = new Map(current.records.map((record) => [record.vin.toUpperCase(), record]));
  const changes: InventorySnapshotChange[] = [];

  for (const [vin, record] of currentByVin) {
    const prior = previousByVin.get(vin);
    if (!prior) {
      changes.push({ type: "ADDED", vin, current: record });
      continue;
    }
    const changedFields = MATERIAL_FIELDS.filter((field) => comparable(prior[field]) !== comparable(record[field])).map(String);
    if (changedFields.length > 0) changes.push({ type: "UPDATED", vin, previous: prior, current: record, changedFields });
    else changes.push({ type: "UNCHANGED", vin, current: record });
  }

  for (const [vin, prior] of previousByVin) {
    if (currentByVin.has(vin)) continue;
    const transitioned = missingTransition(prior);
    changes.push({
      type: transitioned.availabilityState === "missing-repeatedly" ? "MISSING_REPEATEDLY" : "MISSING_ONCE",
      vin,
      previous: prior,
      current: transitioned,
    });
  }

  return {
    providerId: current.providerId,
    dealershipId: current.dealershipId,
    previousFetchedAt: previous.fetchedAt,
    currentFetchedAt: current.fetchedAt,
    changes: changes.sort((a, b) => a.vin.localeCompare(b.vin)),
  };
}
