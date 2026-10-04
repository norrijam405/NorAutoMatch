import { discoverOrrAlgoliaInventory, type OrrAlgoliaDiscovery } from "./orr-public-algolia";

type DiscoveryOptions = Parameters<typeof discoverOrrAlgoliaInventory>[0];

type CacheEntry = {
  key: string;
  discovery: OrrAlgoliaDiscovery;
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;
let cacheEntry: CacheEntry | undefined;
let inFlight: { key: string; promise: Promise<OrrAlgoliaDiscovery> } | undefined;

function stableKey(options: DiscoveryOptions = {}) {
  return JSON.stringify({
    hitsPerPage: options.hitsPerPage ?? 100,
    timeoutMs: options.timeoutMs ?? 8_000,
    maxResponseBytes: options.maxResponseBytes ?? 5 * 1024 * 1024,
    indexSuffix: options.indexSuffix ?? "global_price_desc",
    maxPages: options.maxPages ?? 10,
  });
}

/**
 * Coalesces customer-facing Orr discovery requests inside one running server
 * instance. The dealer transport/source verification still happens in the
 * canonical discovery function; this wrapper only prevents a thundering herd
 * of identical full-snapshot fetches from homepage, inventory, API, and VIN
 * detail requests arriving together.
 *
 * No stale-on-error behavior is allowed here: after the TTL expires, failure to
 * refresh remains a failure and callers retain their existing fail-closed rules.
 */
export function discoverOrrAlgoliaInventoryCached(
  options: DiscoveryOptions = {},
): Promise<OrrAlgoliaDiscovery> {
  const now = Date.now();
  const key = stableKey(options);

  if (cacheEntry && cacheEntry.key === key && cacheEntry.expiresAt > now) {
    return Promise.resolve(cacheEntry.discovery);
  }

  if (inFlight && inFlight.key === key) return inFlight.promise;

  const promise = discoverOrrAlgoliaInventory(options)
    .then((discovery) => {
      cacheEntry = { key, discovery, expiresAt: Date.now() + CACHE_TTL_MS };
      return discovery;
    })
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = undefined;
    });

  inFlight = { key, promise };
  return promise;
}
