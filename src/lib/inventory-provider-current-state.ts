import type { InventoryProviderRecord, InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";

export type InventoryProviderCurrentState = {
  providerId: string;
  dealershipId: string;
  dealershipName: string;
  sourceUrl: string;
  sourceHash: string;
  asOf: string;
  records: InventoryProviderRecord[];
};

export type InventoryProviderStateChange =
  | { type: "ADDED"; vin: string; current: InventoryProviderRecord }
  | { type: "UPDATED"; vin: string; previous: InventoryProviderRecord; current: InventoryProviderRecord; changedFields: string[] }
  | { type: "MISSING_ONCE"; vin: string; previous: InventoryProviderRecord; current: InventoryProviderRecord }
  | { type: "MISSING_REPEATEDLY"; vin: string; previous: InventoryProviderRecord; current: InventoryProviderRecord }
  | { type: "UNCHANGED"; vin: string; current: InventoryProviderRecord };

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
  if (previous.availabilityState === "unavailable-confirmed") return previous;
  const nextState = previous.availabilityState === "missing-once" || previous.availabilityState === "missing-repeatedly"
    ? "missing-repeatedly"
    : "missing-once";
  return { ...previous, availabilityState: nextState };
}

export function reconcileInventoryProviderCurrentState(input: {
  previous: InventoryProviderCurrentState | null;
  currentSnapshot: InventoryProviderSnapshot;
}): { state: InventoryProviderCurrentState; changes: InventoryProviderStateChange[] } {
  const current = assertProviderSnapshotBoundary(input.currentSnapshot);
  const previous = input.previous;
  if (previous && previous.providerId !== current.providerId) throw new Error("INVENTORY_STATE_PROVIDER_MISMATCH");
  if (previous && previous.dealershipId !== current.dealershipId) throw new Error("INVENTORY_STATE_DEALERSHIP_MISMATCH");

  const previousByVin = new Map((previous?.records ?? []).map((record) => [record.vin.toUpperCase(), record]));
  const currentByVin = new Map(current.records.map((record) => [record.vin.toUpperCase(), record]));
  const nextByVin = new Map<string, InventoryProviderRecord>();
  const changes: InventoryProviderStateChange[] = [];

  for (const [vin, raw] of currentByVin) {
    const observed = { ...raw, availabilityState: "active" as const };
    const prior = previousByVin.get(vin);
    nextByVin.set(vin, observed);
    if (!prior) {
      changes.push({ type: "ADDED", vin, current: observed });
      continue;
    }
    const changedFields = MATERIAL_FIELDS.filter((field) => comparable(prior[field]) !== comparable(observed[field])).map(String);
    if (prior.availabilityState !== "active" && prior.availabilityState !== "observed") changedFields.push("availabilityState");
    if (changedFields.length > 0) changes.push({ type: "UPDATED", vin, previous: prior, current: observed, changedFields: [...new Set(changedFields)] });
    else changes.push({ type: "UNCHANGED", vin, current: observed });
  }

  for (const [vin, prior] of previousByVin) {
    if (currentByVin.has(vin)) continue;
    const transitioned = missingTransition(prior);
    nextByVin.set(vin, transitioned);
    if (transitioned.availabilityState === "unavailable-confirmed") {
      changes.push({ type: "UNCHANGED", vin, current: transitioned });
    } else if (transitioned.availabilityState === "missing-repeatedly") {
      changes.push({ type: "MISSING_REPEATEDLY", vin, previous: prior, current: transitioned });
    } else {
      changes.push({ type: "MISSING_ONCE", vin, previous: prior, current: transitioned });
    }
  }

  return {
    state: {
      providerId: current.providerId,
      dealershipId: current.dealershipId,
      dealershipName: current.dealershipName,
      sourceUrl: current.sourceUrl,
      sourceHash: current.sourceHash,
      asOf: current.fetchedAt,
      records: [...nextByVin.values()].sort((a, b) => a.vin.localeCompare(b.vin)),
    },
    changes: changes.sort((a, b) => a.vin.localeCompare(b.vin)),
  };
}
