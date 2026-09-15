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

/**
 * Customer-facing Orr catalog loader.
 *
 * Preference order:
 * 1. Durable verified provider cache when present and eligible.
 * 2. Bounded read-only public Orr/Algolia snapshot, passed through the same
 *    source gate, normalization, freshness, dealer boundary, and catalog
 *    integrity checks as the established live path.
 *
 * Live-enabled mode never substitutes demonstration inventory when both real
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

  // This path remains fail-closed. loadOrrCustomerCatalog performs the public
  // source gate and throws rather than substituting demo records on live failure.
  return loadOrrCustomerCatalog(options);
}
