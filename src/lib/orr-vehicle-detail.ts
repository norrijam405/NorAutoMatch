import type { LiveInventoryRecord } from "./live-inventory";
import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import { buildInventoryShadowReceipt } from "./inventory-shadow-receipt";
import { discoverOrrAlgoliaInventoryCached } from "./orr-public-algolia-cache";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export async function loadVerifiedOrrVehicleDetail(vinInput: string): Promise<{
  vehicle: LiveInventoryRecord;
  fetchedAt: string;
  sourceHash: string;
  rawHitCount: number;
}> {
  const vin = vinInput.trim().toUpperCase();
  if (!VIN_RE.test(vin)) throw new Error("NORAUTO_VEHICLE_DETAIL_INVALID_VIN");

  const discovery = await discoverOrrAlgoliaInventoryCached({ hitsPerPage: 100, maxPages: 10 });
  const sourceGate = buildInventoryShadowReceipt(discovery);
  if (sourceGate.gate.status !== "PASS") {
    throw new Error(`NORAUTO_VEHICLE_DETAIL_SOURCE_GATE_FAILED:${sourceGate.gate.reasons.join(",")}`);
  }

  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  // Do not let an unrelated malformed dealer record suppress a healthy VIN detail page.
  // Snapshot-wide transport/source integrity still has to pass above; here we fail closed
  // only when the requested VIN itself carries a fatal normalization issue.
  const targetFatalIssues = normalized.issues.filter(
    (issue) => issue.severity === "ERROR" && issue.vin?.toUpperCase() === vin,
  );
  if (targetFatalIssues.length > 0) {
    throw new Error(`NORAUTO_VEHICLE_DETAIL_NORMALIZATION_FAILED:${targetFatalIssues.map((issue) => issue.code).join(",")}`);
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
