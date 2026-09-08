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
  id?: number | string;
  dealer_id?: number | string;
  dealer_ids?: Array<number | string>;
  dealership?: string;
  vin?: string;
  stock_number?: string;
  make_year?: number | string;
  make?: string;
  model?: string;
  car_trim?: string;
  price?: number | string;
  functional_price?: number | string;
  msrp?: number | string;
  odometer?: number | string;
  car_condition?: string;
  category?: string;
  body_subtype?: string;
  drivetrain?: string;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  standardized_fuel_type?: string;
  exterior_color?: string;
  interior_color?: string;
  city_mpg?: number | string;
  highway_mpg?: number | string;
  parsed_features?: string[];
  features?: string;
  rebate_price?: number | string;
  is_active?: boolean;
  archived?: boolean;
  on_hold?: boolean;
  stock_status?: string;
};

export type OrrAlgoliaDiscovery = {
  sourceUrl: string;
  sourceHash: string;
  fetchedAt: string;
  indexName: string;
  dealerId: number;
  hits: OrrAlgoliaHit[];
  reportedHitCount: number;
  pagesFetched: number;
  completeSnapshot: boolean;
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
      | "DEALER_BOUNDARY_VIOLATION"
      | "SNAPSHOT_INCOMPLETE",
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

async function queryPage(input: {
  endpoint: string;
  config: OrrAlgoliaConfig;
  page: number;
  hitsPerPage: number;
  timeoutMs: number;
  maxResponseBytes: number;
}) {
  const params = new URLSearchParams({
    filters: `dealer_id:${ORR_DEALER_ID}`,
    hitsPerPage: String(input.hitsPerPage),
    page: String(input.page),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await fetch(input.endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": input.config.appId,
        "X-Algolia-API-Key": input.config.apiKey,
        "User-Agent": "NorAutoMatch-Inventory/1.0 (+read-only public inventory sync)",
      },
      body: JSON.stringify({ params: params.toString() }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new OrrAlgoliaError(`Public Algolia inventory query returned HTTP ${response.status}.`, "ALGOLIA_HTTP_STATUS");
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > input.maxResponseBytes) throw new OrrAlgoliaError("Public Algolia response exceeded byte limit.", "ALGOLIA_RESPONSE_TOO_LARGE");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > input.maxResponseBytes) throw new OrrAlgoliaError("Public Algolia response exceeded byte limit.", "ALGOLIA_RESPONSE_TOO_LARGE");
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      hits?: OrrAlgoliaHit[];
      nbHits?: number;
      nbPages?: number;
      page?: number;
    };
    if (!Array.isArray(parsed.hits) || !Number.isInteger(parsed.nbHits) || !Number.isInteger(parsed.nbPages) || !Number.isInteger(parsed.page)) {
      throw new OrrAlgoliaError("Public Algolia response lacked required pagination metadata.", "ALGOLIA_RESPONSE_INVALID");
    }
    for (const hit of parsed.hits) {
      if (Number(hit.dealer_id) !== ORR_DEALER_ID) {
        throw new OrrAlgoliaError("A returned inventory hit crossed the dealer_id 2175 boundary.", "DEALER_BOUNDARY_VIOLATION");
      }
    }
    return parsed as { hits: OrrAlgoliaHit[]; nbHits: number; nbPages: number; page: number };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverOrrAlgoliaInventory(options: {
  hitsPerPage?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
  indexSuffix?: string;
  maxPages?: number;
} = {}): Promise<OrrAlgoliaDiscovery> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxResponseBytes = options.maxResponseBytes ?? 5 * 1024 * 1024;
  const hitsPerPage = Math.max(1, Math.min(100, Math.floor(options.hitsPerPage ?? 100)));
  const maxPages = Math.max(1, Math.min(20, Math.floor(options.maxPages ?? 10)));

  const inventoryHtml = await fetchTextBounded(ORR_INVENTORY_URL, timeoutMs, maxResponseBytes);
  const config = extractOrrAlgoliaConfig(inventoryHtml);
  const indexName = `${config.indexPrefix}${options.indexSuffix ?? DEFAULT_INDEX_SUFFIX}`;
  const host = `${config.appId.toLowerCase()}-dsn.algolia.net`;
  const endpoint = `https://${host}/1/indexes/${encodeURIComponent(indexName)}/query`;

  try {
    const first = await queryPage({ endpoint, config, page: 0, hitsPerPage, timeoutMs, maxResponseBytes });
    if (first.nbPages > maxPages) {
      throw new OrrAlgoliaError(`Dealer snapshot requires ${first.nbPages} pages, above configured maximum ${maxPages}.`, "SNAPSHOT_INCOMPLETE");
    }

    const hits = [...first.hits];
    for (let page = 1; page < first.nbPages; page += 1) {
      const next = await queryPage({ endpoint, config, page, hitsPerPage, timeoutMs, maxResponseBytes });
      if (next.nbHits !== first.nbHits || next.nbPages !== first.nbPages || next.page !== page) {
        throw new OrrAlgoliaError("Pagination metadata changed during one inventory snapshot; refusing partial reconciliation.", "SNAPSHOT_INCOMPLETE");
      }
      hits.push(...next.hits);
    }

    const completeSnapshot = hits.length === first.nbHits;
    if (!completeSnapshot) {
      throw new OrrAlgoliaError(`Expected ${first.nbHits} dealer hits but fetched ${hits.length}.`, "SNAPSHOT_INCOMPLETE");
    }

    return {
      sourceUrl: ORR_INVENTORY_URL,
      sourceHash: sha256(inventoryHtml),
      fetchedAt: new Date().toISOString(),
      indexName,
      dealerId: ORR_DEALER_ID,
      hits,
      reportedHitCount: first.nbHits,
      pagesFetched: first.nbPages,
      completeSnapshot,
    };
  } catch (error) {
    if (error instanceof OrrAlgoliaError) throw error;
    throw new OrrAlgoliaError(error instanceof Error ? error.message : "Public Algolia inventory query failed.", "ALGOLIA_RESPONSE_INVALID");
  }
}
