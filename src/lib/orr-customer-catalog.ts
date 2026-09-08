import { inventory as demoInventory } from "./inventory";
import { assertInventoryCatalogIntegrity } from "./inventory-catalog-integrity";
import { buildDemoCatalog, type InventoryCatalog } from "./inventory-catalog";
import { selectCustomerInventory, resolveInventoryRuntime } from "./inventory-runtime";
import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import { discoverOrrAlgoliaInventory, type OrrAlgoliaDiscovery } from "./orr-public-algolia";

export type OrrCustomerCatalogOptions = {
  mode?: string;
  liveActivation?: string;
  nowMs?: number;
  discover?: () => Promise<OrrAlgoliaDiscovery>;
};

export async function loadOrrCustomerCatalog(options: OrrCustomerCatalogOptions = {}): Promise<InventoryCatalog> {
  const runtime = resolveInventoryRuntime({ mode: options.mode, liveActivation: options.liveActivation });

  if (runtime.effectiveMode !== "live-enabled") {
    return assertInventoryCatalogIntegrity(buildDemoCatalog({
      runtime,
      demoInventory,
      generatedAt: new Date(options.nowMs ?? Date.now()).toISOString(),
    }));
  }

  const discover = options.discover ?? (() => discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 }));
  const discovery = await discover();
  if (!discovery.completeSnapshot || discovery.hits.length !== discovery.reportedHitCount || discovery.dealerId !== 2175) {
    throw new Error("LIVE_INVENTORY_SNAPSHOT_NOT_TRUSTWORTHY");
  }

  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const bridge = selectCustomerInventory({
    runtime,
    demoInventory,
    liveRecords: normalized.records,
    nowMs: options.nowMs ?? Date.parse(discovery.fetchedAt),
  });

  const warningCount = normalized.issues.filter((issue) => issue.severity === "WARNING").length;
  const errorCount = normalized.issues.filter((issue) => issue.severity === "ERROR").length;
  const inTransitCount = normalized.records.filter((record) => record.inTransit === true).length;

  return assertInventoryCatalogIntegrity({
    requestedMode: runtime.requestedMode,
    effectiveMode: runtime.effectiveMode,
    customerVisibleLiveInventory: true,
    runtimeReason: runtime.reason,
    source: "orr-live",
    generatedAt: new Date(options.nowMs ?? Date.now()).toISOString(),
    vehicles: bridge.vehicles,
    sourceEvidence: {
      dealerId: 2175,
      sourceUrl: discovery.sourceUrl,
      sourceHash: discovery.sourceHash,
      fetchedAt: discovery.fetchedAt,
      rawHitCount: discovery.hits.length,
      normalizedCount: normalized.records.length,
      eligibleCount: bridge.vehicles.length,
      rejectedCount: bridge.rejected.length + errorCount,
      inTransitCount,
      warningCount,
      errorCount,
    },
  });
}
