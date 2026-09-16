import type { InventoryCatalog } from "./inventory-catalog";
import { resolveInventoryRuntime } from "./inventory-runtime";
import { loadOrrCachedCustomerCatalog } from "./orr-cached-customer-catalog";
import { loadOrrCustomerCatalog } from "./orr-customer-catalog";

export type OrrResilientCatalogOptions = {
  mode?: string;
  liveActivation?: string;
  nowMs?: number;
  maxAgeMs?: number;
};

const LIVE_PROCESS_CACHE_TTL_MS = 60_000;
let processLiveCatalog: { catalog: InventoryCatalog; cachedAtMs: number } | undefined;
let inflightLiveCatalog: Promise<InventoryCatalog> | undefined;

async function loadSingleFlightLiveCatalog(options: OrrResilientCatalogOptions) {
  const nowMs = options.nowMs ?? Date.now();
  if (processLiveCatalog && nowMs - processLiveCatalog.cachedAtMs <= LIVE_PROCESS_CACHE_TTL_MS) {
    return processLiveCatalog.catalog;
  }

  if (inflightLiveCatalog) return inflightLiveCatalog;

  inflightLiveCatalog = loadOrrCustomerCatalog(options)
    .then((catalog) => {
      processLiveCatalog = { catalog, cachedAtMs: Date.now() };
      return catalog;
    })
    .finally(() => {
      inflightLiveCatalog = undefined;
    });

  return inflightLiveCatalog;
}

/**
 * Customer-facing Orr catalog loader.
 *
 * Preference order:
 * 1. Durable verified provider cache when present and eligible.
 * 2. A short-lived process-local copy of the most recent verified live catalog.
 * 3. One bounded read-only public Orr/Algolia fetch shared by concurrent callers.
 *
 * Live-enabled mode never substitutes demonstration inventory when all real
 * sources fail. The caller receives the live error and must fail closed.
 */
export async function loadOrrResilientCustomerCatalog(
  options: OrrResilientCatalogOptions = {},
): Promise<InventoryCatalog> {
  const runtime = resolveInventoryRuntime({
    mode: options.mode,
    liveActivation: options.liveActivation,
  });

  if (runtime.effectiveMode !== "live-enabled") {
    return loadOrrCustomerCatalog(options);
  }

  try {
    return await loadOrrCachedCustomerCatalog(options);
  } catch (cacheError) {
    console.warn(
      "NORAUTO_INVENTORY_CACHE_BYPASS_TO_VERIFIED_LIVE",
      cacheError instanceof Error ? cacheError.message : String(cacheError),
    );
  }

  // The fallback remains fail-closed. A single verified dealer fetch is shared
  // by simultaneous homepage/API/catalog requests, then reused for only 60s.
  return loadSingleFlightLiveCatalog(options);
}
