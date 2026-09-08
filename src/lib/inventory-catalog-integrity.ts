import type { InventoryCatalog } from "./inventory-catalog";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export type CatalogIntegrityFinding = {
  code:
    | "LIVE_SOURCE_WITHOUT_ACTIVATION"
    | "LIVE_MODE_WITH_DEMO_SOURCE"
    | "DUPLICATE_VEHICLE_ID"
    | "LIVE_ID_NOT_VIN"
    | "NON_POSITIVE_PRICE"
    | "UNSUPPORTED_BODY_TYPE"
    | "EVIDENCE_COUNT_MISMATCH";
  vehicleId?: string;
  message: string;
};

export function verifyInventoryCatalogIntegrity(catalog: InventoryCatalog): CatalogIntegrityFinding[] {
  const findings: CatalogIntegrityFinding[] = [];

  if (catalog.source === "orr-live" && !catalog.customerVisibleLiveInventory) {
    findings.push({ code: "LIVE_SOURCE_WITHOUT_ACTIVATION", message: "Live source catalog cannot be customer-visible without an activated runtime decision." });
  }
  if (catalog.effectiveMode === "live-enabled" && catalog.source !== "orr-live") {
    findings.push({ code: "LIVE_MODE_WITH_DEMO_SOURCE", message: "Activated live mode cannot silently present demonstration inventory." });
  }

  const ids = new Set<string>();
  for (const vehicle of catalog.vehicles) {
    if (ids.has(vehicle.id)) {
      findings.push({ code: "DUPLICATE_VEHICLE_ID", vehicleId: vehicle.id, message: "Customer catalog contains a duplicate vehicle identifier." });
    }
    ids.add(vehicle.id);

    if (catalog.source === "orr-live" && !VIN_RE.test(vehicle.id)) {
      findings.push({ code: "LIVE_ID_NOT_VIN", vehicleId: vehicle.id, message: "Live customer vehicle identifier must be the normalized VIN." });
    }
    if (!Number.isFinite(vehicle.price) || vehicle.price <= 0) {
      findings.push({ code: "NON_POSITIVE_PRICE", vehicleId: vehicle.id, message: "Customer catalog vehicle must have a positive finite price." });
    }
    if (!(["SUV", "Sedan", "Truck"] as const).includes(vehicle.type)) {
      findings.push({ code: "UNSUPPORTED_BODY_TYPE", vehicleId: vehicle.id, message: "Customer matcher received an unsupported body type." });
    }
  }

  if (catalog.sourceEvidence && catalog.sourceEvidence.eligibleCount !== catalog.vehicles.length) {
    findings.push({ code: "EVIDENCE_COUNT_MISMATCH", message: "Source evidence eligible count does not equal customer catalog vehicle count." });
  }

  return findings;
}

export function assertInventoryCatalogIntegrity(catalog: InventoryCatalog): InventoryCatalog {
  const findings = verifyInventoryCatalogIntegrity(catalog);
  if (findings.length > 0) {
    throw new Error(`INVENTORY_CATALOG_INTEGRITY_FAILED:${findings.map((finding) => finding.code).join(",")}`);
  }
  return catalog;
}
