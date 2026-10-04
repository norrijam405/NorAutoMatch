import type { Pool } from "pg";
import { inventory as demoInventory } from "./inventory";
import { assertInventoryCatalogIntegrity } from "./inventory-catalog-integrity";
import { buildDemoCatalog, type InventoryCatalog } from "./inventory-catalog";
import { resolveInventoryRuntime, type InventoryRuntimeDecision } from "./inventory-runtime";
import { loadCachedCustomerInventory, type CachedInventoryReadResult } from "./inventory-provider-cache-reader";

export function buildProviderCachedCatalog(input: {
  runtime: InventoryRuntimeDecision;
  cached: CachedInventoryReadResult;
  generatedAt?: string;
}): InventoryCatalog {
  if (input.runtime.effectiveMode !== "live-enabled" || !input.runtime.customerVisibleLiveInventory) {
    throw new Error("INVENTORY_CACHE_RUNTIME_NOT_ACTIVATED");
  }
  if (!input.cached.eligibleForCustomerUse) throw new Error("INVENTORY_CACHE_NOT_ELIGIBLE");
  if (input.cached.customerVisibleLiveInventory) throw new Error("INVENTORY_CACHE_READER_AUTHORITY_DRIFT");

  return assertInventoryCatalogIntegrity({
    requestedMode: input.runtime.requestedMode,
    effectiveMode: input.runtime.effectiveMode,
    customerVisibleLiveInventory: true,
    runtimeReason: input.runtime.reason,
    source: "provider-cache",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    vehicles: input.cached.vehicles,
    sourceEvidence: {
      providerId: input.cached.providerId,
      dealerId: input.cached.dealershipId,
      sourceUrl: input.cached.sourceUrl,
      sourceHash: input.cached.sourceHash,
      fetchedAt: input.cached.fetchedAt,
      rawHitCount: input.cached.vehicles.length + input.cached.rejected.length,
      normalizedCount: input.cached.vehicles.length + input.cached.rejected.length,
      eligibleCount: input.cached.vehicles.length,
      rejectedCount: input.cached.rejected.length,
      inTransitCount: input.cached.rejected.filter((item) => item.reason === "source_status:in_transit").length,
      warningCount: 0,
      errorCount: 0,
    },
  });
}

export async function loadProviderCachedCatalog(input: {
  pool?: Pool;
  providerId: string;
  dealershipId: string;
  mode?: string;
  liveActivation?: string;
  nowMs?: number;
  maxAgeMs?: number;
}): Promise<InventoryCatalog> {
  const runtime = resolveInventoryRuntime({ mode: input.mode, liveActivation: input.liveActivation });

  if (runtime.effectiveMode !== "live-enabled") {
    return assertInventoryCatalogIntegrity(buildDemoCatalog({
      runtime,
      demoInventory,
      generatedAt: new Date(input.nowMs ?? Date.now()).toISOString(),
    }));
  }

  if (!input.pool) throw new Error("INVENTORY_CACHE_DATABASE_UNAVAILABLE");

  const cached = await loadCachedCustomerInventory({
    pool: input.pool,
    providerId: input.providerId,
    dealershipId: input.dealershipId,
    nowMs: input.nowMs,
    maxAgeMs: input.maxAgeMs,
  });

  return buildProviderCachedCatalog({
    runtime,
    cached,
    generatedAt: new Date(input.nowMs ?? Date.now()).toISOString(),
  });
}
