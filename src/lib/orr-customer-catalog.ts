import { inventory as demoInventory } from "./inventory";
import { assertInventoryCatalogIntegrity } from "./inventory-catalog-integrity";
import { buildDemoCatalog, type InventoryCatalog } from "./inventory-catalog";
import { selectCustomerInventory, resolveInventoryRuntime } from "./inventory-runtime";
import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import { buildInventoryShadowReceipt } from "./inventory-shadow-receipt";
import { discoverOrrAlgoliaInventory, type OrrAlgoliaDiscovery } from "./orr-public-algolia";

export type OrrCustomerCatalogOptions = {
  mode?: string;
  liveActivation?: string;
  nowMs?: number;
  discover?: () => Promise<OrrAlgoliaDiscovery>;
};

function safeIdentityGateDiagnostics(discovery: OrrAlgoliaDiscovery) {
  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const identityFailures = normalized.issues
    .filter((issue) => issue.code === "IDENTITY_INCOMPLETE")
    .slice(0, 3)
    .map((issue) => {
      const hit = discovery.hits.find((candidate) => {
        const objectID = typeof candidate.objectID === "string" ? candidate.objectID : candidate.id?.toString();
        return (issue.objectID && objectID === issue.objectID) || (issue.vin && candidate.vin === issue.vin);
      });
      if (!hit) return { objectID: issue.objectID, vin: issue.vin, hitFound: false };
      return {
        objectID: issue.objectID,
        vin: issue.vin,
        hitFound: true,
        identity: {
          make_year: hit.make_year,
          year: hit.year,
          make: hit.make,
          model: hit.model,
          car_trim: hit.car_trim,
          trim: hit.trim,
          vehicle_year: hit.vehicle_year,
          vehicle_make: hit.vehicle_make,
          vehicle_model: hit.vehicle_model,
          vehicle_trim: hit.vehicle_trim,
        },
        availableKeys: Object.keys(hit)
          .filter((key) => /(^|_)(year|make|model|trim)($|_)/i.test(key))
          .sort(),
      };
    });

  return {
    rawHitCount: discovery.hits.length,
    normalizedCount: normalized.records.length,
    issueCounts: normalized.issues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
      return counts;
    }, {}),
    identityFailures,
  };
}

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
  const sourceGate = buildInventoryShadowReceipt(discovery);
  if (sourceGate.gate.status !== "PASS") {
    console.warn("NORAUTO_INVENTORY_SOURCE_GATE_DIAGNOSTIC", {
      reasons: sourceGate.gate.reasons,
      ...safeIdentityGateDiagnostics(discovery),
    });
    throw new Error(`LIVE_INVENTORY_SOURCE_GATE_FAILED:${sourceGate.gate.reasons.join(",")}`);
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
