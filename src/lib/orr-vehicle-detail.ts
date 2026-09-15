import type { LiveInventoryRecord } from "./live-inventory";
import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import { buildInventoryShadowReceipt } from "./inventory-shadow-receipt";
import { discoverOrrAlgoliaInventory } from "./orr-public-algolia";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export async function loadVerifiedOrrVehicleDetail(vinInput: string): Promise<{
  vehicle: LiveInventoryRecord;
  fetchedAt: string;
  sourceHash: string;
  rawHitCount: number;
}> {
  const vin = vinInput.trim().toUpperCase();
  if (!VIN_RE.test(vin)) throw new Error("NORAUTO_VEHICLE_DETAIL_INVALID_VIN");

  const discovery = await discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 });
  const sourceGate = buildInventoryShadowReceipt(discovery);
  if (sourceGate.gate.status !== "PASS") {
    throw new Error(`NORAUTO_VEHICLE_DETAIL_SOURCE_GATE_FAILED:${sourceGate.gate.reasons.join(",")}`);
  }

  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const fatalIssues = normalized.issues.filter((issue) => issue.severity === "ERROR");
  if (fatalIssues.length > 0) {
    throw new Error(`NORAUTO_VEHICLE_DETAIL_NORMALIZATION_FAILED:${fatalIssues.map((issue) => issue.code).join(",")}`);
  }

  const vehicle = normalized.records.find((record) => record.vin === vin);
  if (!vehicle || vehicle.inTransit === true || vehicle.availabilityState !== "ACTIVE_CURRENT") {
    throw new Error("NORAUTO_VEHICLE_DETAIL_NOT_CURRENT");
  }

  return {
    vehicle,
    fetchedAt: discovery.fetchedAt,
    sourceHash: discovery.sourceHash,
    rawHitCount: discovery.hits.length,
  };
}
