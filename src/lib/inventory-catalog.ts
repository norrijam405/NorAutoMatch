import type { Vehicle } from "./inventory";
import type { InventoryRuntimeDecision } from "./inventory-runtime";

export type InventoryCatalogSource = "demo" | "orr-live";

export type InventoryCatalog = {
  requestedMode: InventoryRuntimeDecision["requestedMode"];
  effectiveMode: InventoryRuntimeDecision["effectiveMode"];
  customerVisibleLiveInventory: boolean;
  runtimeReason: InventoryRuntimeDecision["reason"];
  source: InventoryCatalogSource;
  generatedAt: string;
  vehicles: Vehicle[];
  sourceEvidence?: {
    dealerId: 2175;
    sourceUrl: string;
    sourceHash: string;
    fetchedAt: string;
    rawHitCount: number;
    normalizedCount: number;
    eligibleCount: number;
    rejectedCount: number;
    inTransitCount: number;
    warningCount: number;
    errorCount: number;
  };
};

export function buildDemoCatalog(input: {
  runtime: InventoryRuntimeDecision;
  demoInventory: Vehicle[];
  generatedAt?: string;
}): InventoryCatalog {
  return {
    requestedMode: input.runtime.requestedMode,
    effectiveMode: input.runtime.effectiveMode,
    customerVisibleLiveInventory: false,
    runtimeReason: input.runtime.reason,
    source: "demo",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    vehicles: input.demoInventory,
  };
}
