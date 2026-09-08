import { createHash } from "node:crypto";

const ORR_INVENTORY_URL = "https://orrnissanwest.com/inventory";
const ORR_DEALER_ID = 2175;
const DEFAULT_INDEX_SUFFIX = "global_price_desc";

export type OrrAlgoliaConfig = {
  appId: string;
  apiKey: string;
  indexPrefix: string;
};

export type OrrAlgoliaHit = Record<string, unknown> & {
  objectID?: string;
  dealer_id?: number | string;
  vin?: string;
  stock?: string;
  stock_number?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  price?: number;
  msrp?: number;
  mileage?: number;
  car_condition?: string;
};

export type OrrAlgoliaDiscovery = {
  sourceUrl: string;
  sourceHash: string;
  fetchedAt: string;
  indexName: string;
  dealerId: number;
  hits: OrrAlgoliaHit[];
};

export class OrrAlgoliaError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFIG_FETCH_FAILED"
      | "CONFIG_PARSE_FAILED"
      | "ALGOLIA_HTTP_STATUS"
      | "ALGOLIA_RESPONSE_INVALID"
      | "ALGOLIA_RESPONSE_TOO_LARGE"
      | "DEALER_BOUNDARY_VIOLATION",
  ) {
    super(message);
    this.name = "OrrAlgoliaError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function extractQuoted(source: string, key: string) {
  const normalized = source.replace(/\\"/g, '"');
  const match = normalized.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
  return match?.[1];
}

export function extractOrrAlgoliaConfig(html: string): OrrAlgoliaConfig {
  const appId = extractQuoted(html, "ALGOLIA_APP_ID");
  const apiKey = extractQuoted(html, "ALGOLIA_API_KEY");
  const indexPrefix = extractQuoted(html, "ALGOLIA_INVENTORY_INDEX");
  if (!appId || !apiKey || !indexPrefix) {
    throw new OrrAlgoliaError("Public inventory page did not expose the expected Algolia search configuration.", "CONFIG_PARSE_FAILED");
  }
  if (!/^[A-Z0-9]+$/i.test(appId) || !/^[a-z0-9-]+$/i.test(indexPrefix)) {
    throw new OrrAlgoliaError("Public Algolia configuration failed format validation.", "CONFIG_PARSE_FAILED");
  }
  return { appId, apiKey, indexPrefix };
}

async function fetchTextBounded(url: string, timeoutMs: number, maxBytes: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "NorAutoMatch-Inventory/1.0 (+read-only public inventory sync)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new OrrAlgoliaError(`Public inventory page returned HTTP ${response.status}.`, "CONFIG_FETCH_FAILED");
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > maxBytes) throw new OrrAlgoliaError("Public inventory page exceeded byte limit.", "CONFIG_FETCH_FAILED");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxBytes) throw new OrrAlgoliaError("Public inventory page exceeded byte limit.", "CONFIG_FETCH_FAILED");
    return new TextDecoder().decode(bytes);
  } catch (error) {
    if (error instanceof OrrAlgoliaError) throw error;
    throw new OrrAlgoliaError(error instanceof Error ? error.message : "Public inventory config fetch failed.", "CONFIG_FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverOrrAlgoliaInventory(options: {
  hitsPerPage?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  indexSuffix?: string;
} = {}): Promise<OrrAlgoliaDiscovery> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxResponseBytes = options.maxResponseBytes ?? 5 * 1024 * 1024;
  const hitsPerPage = Math.max(1, Math.min(100, Math.floor(options.hitsPerPage ?? 25)));

  const inventoryHtml = await fetchTextBounded(ORR_INVENTORY_URL, timeoutMs, maxResponseBytes);
  const config = extractOrrAlgoliaConfig(inventoryHtml);
  const indexName = `${config.indexPrefix}${options.indexSuffix ?? DEFAULT_INDEX_SUFFIX}`;
  const host = `${config.appId.toLowerCase()}-dsn.algolia.net`;
  const endpoint = `https://${host}/1/indexes/${encodeURIComponent(indexName)}/query`;

  const params = new URLSearchParams({
    filters: `dealer_id:${ORR_DEALER_ID}`,
    hitsPerPage: String(hitsPerPage),
    page: "0",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": config.appId,
        "X-Algolia-API-Key": config.apiKey,
        "User-Agent": "NorAutoMatch-Inventory/1.0 (+read-only public inventory sync)",
      },
      body: JSON.stringify({ params: params.toString() }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new OrrAlgoliaError(`Public Algolia inventory query returned HTTP ${response.status}.`, "ALGOLIA_HTTP_STATUS");
    }
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > maxResponseBytes) {
      throw new OrrAlgoliaError("Public Algolia response exceeded byte limit.", "ALGOLIA_RESPONSE_TOO_LARGE");
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxResponseBytes) {
      throw new OrrAlgoliaError("Public Algolia response exceeded byte limit.", "ALGOLIA_RESPONSE_TOO_LARGE");
    }
    const raw = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(raw) as { hits?: OrrAlgoliaHit[] };
    if (!Array.isArray(parsed.hits)) {
      throw new OrrAlgoliaError("Public Algolia response did not contain a hits array.", "ALGOLIA_RESPONSE_INVALID");
    }
    for (const hit of parsed.hits) {
      if (Number(hit.dealer_id) !== ORR_DEALER_ID) {
        throw new OrrAlgoliaError("A returned inventory hit crossed the dealer_id 2175 boundary.", "DEALER_BOUNDARY_VIOLATION");
      }
    }

    return {
      sourceUrl: ORR_INVENTORY_URL,
      sourceHash: sha256(inventoryHtml),
      fetchedAt: new Date().toISOString(),
      indexName,
      dealerId: ORR_DEALER_ID,
      hits: parsed.hits,
    };
  } catch (error) {
    if (error instanceof OrrAlgoliaError) throw error;
    throw new OrrAlgoliaError(error instanceof Error ? error.message : "Public Algolia inventory query failed.", "ALGOLIA_RESPONSE_INVALID");
  } finally {
    clearTimeout(timer);
  }
}
