import { createHash } from "node:crypto";
import type { LiveInventoryRecord } from "@/lib/live-inventory";

const ORR_ORIGIN = "https://orrnissanwest.com";
const SOURCE_NAME = "orrnissanwest_public";
export const ORR_PUBLIC_PARSER_VERSION = "orr-public-v1";

const VDP_PATH_RE = /^\/inventory\/(New|Used)-[^?#\s]+-([A-HJ-NPR-Z0-9]{17})(?:[?#].*)?$/i;
const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/i;

export type OrrPublicFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
};

export type OrrPublicDiscovery = {
  sourceUrl: string;
  fetchedAt: string;
  sourceHash: string;
  vehicleUrls: string[];
};

export class OrrPublicInventoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "URL_NOT_ALLOWED"
      | "FETCH_FAILED"
      | "HTTP_STATUS"
      | "CONTENT_TYPE"
      | "RESPONSE_TOO_LARGE"
      | "REDIRECT_NOT_ALLOWED"
      | "PARSE_FAILED",
  ) {
    super(message);
    this.name = "OrrPublicInventoryError";
  }
}

function sha256Utf8(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertAllowedUrl(rawUrl: string) {
  const url = new URL(rawUrl, ORR_ORIGIN);
  if (url.protocol !== "https:" || url.origin !== ORR_ORIGIN) {
    throw new OrrPublicInventoryError("Inventory URL is outside the approved Orr public origin.", "URL_NOT_ALLOWED");
  }
  return url;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function toVisibleText(html: string) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textAfterLabel(text: string, labels: string[], maxChars = 90) {
  for (const label of labels) {
    const re = new RegExp(`${escapeRegExp(label)}\\s*[:#-]?\\s*([^|]{1,${maxChars}})`, "i");
    const match = text.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function moneyAfterLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const re = new RegExp(`${escapeRegExp(label)}\\s*[-+]?\\s*\\$\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`, "i");
    const match = text.match(re);
    if (match?.[1]) return Number(match[1].replace(/,/g, ""));
  }
  return undefined;
}

function integerAfterLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const re = new RegExp(`${escapeRegExp(label)}\\s*[:#-]?\\s*([0-9][0-9,]*)`, "i");
    const match = text.match(re);
    if (match?.[1]) return Number(match[1].replace(/,/g, ""));
  }
  return undefined;
}

function normalizeValue(value: string | undefined) {
  if (!value) return undefined;
  return value
    .replace(/\s+(?:Check Availability|Value Trade|Schedule Test Drive|Call Us|Overview|Specs|Features|Description).*$/i, "")
    .trim();
}

function extractVehicleHeading(text: string, sourceUrl: string) {
  const path = new URL(sourceUrl).pathname;
  const slugMatch = path.match(/^\/inventory\/(New|Used)-(\d{4})-([^-]+)-([^-]+)-/i);
  const condition = slugMatch?.[1];
  const year = slugMatch?.[2] ? Number(slugMatch[2]) : undefined;
  const make = slugMatch?.[3]?.replace(/_/g, " ");
  const model = slugMatch?.[4]?.replace(/_/g, " ");

  const headingRe = /\b(20\d{2})\s+([A-Za-z0-9]+)[®™]?\s+([A-Za-z0-9][A-Za-z0-9 -]{0,40})\s+([A-Za-z0-9][A-Za-z0-9 -]{0,30})(?=\s+(?:Price|MSRP|Market Price|Stock|Check Availability|•|\d{1,3},\d{3}\s+miles))/i;
  const heading = text.match(headingRe);

  return {
    condition: condition ?? undefined,
    year: heading?.[1] ? Number(heading[1]) : year,
    make: normalizeValue(heading?.[2]) ?? make,
    model: normalizeValue(heading?.[3]) ?? model,
    trim: normalizeValue(heading?.[4]),
  };
}

function collectIncentives(text: string) {
  const labels = [
    "Nissan Customer Cash",
    "ORR Discount",
    "Nissan Conditional Offer - College Graduate Discount",
    "Nissan Conditional Offer - Military Appreciation",
    "Nissan Returning EV NMAC Loyalty",
    "Nissan 72 and 84 Month NMAC APR Bonus Cash",
  ];
  const incentives: string[] = [];
  for (const label of labels) {
    const amount = moneyAfterLabel(text, [label]);
    if (amount !== undefined) incentives.push(`${label}: $${amount.toLocaleString("en-US")}`);
  }
  return incentives;
}

export function discoverOrrVehicleUrlsFromHtml(html: string, sourceUrl = ORR_ORIGIN) {
  assertAllowedUrl(sourceUrl);
  const urls = new Set<string>();
  const hrefRe = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html))) {
    const href = decodeHtml(match[1]);
    let candidate: URL;
    try {
      candidate = new URL(href, ORR_ORIGIN);
    } catch {
      continue;
    }
    if (candidate.origin !== ORR_ORIGIN || !VDP_PATH_RE.test(candidate.pathname)) continue;
    candidate.hash = "";
    candidate.search = "";
    urls.add(candidate.toString());
  }
  return [...urls].sort();
}

export function parseOrrVehicleDetailHtml(input: {
  html: string;
  sourceUrl: string;
  fetchedAt: string;
}): Omit<
  LiveInventoryRecord,
  "firstSeenAt" | "lastSeenAt" | "availabilityState" | "consecutiveHealthyMisses"
> {
  const url = assertAllowedUrl(input.sourceUrl);
  const pathVin = url.pathname.match(VDP_PATH_RE)?.[2]?.toUpperCase();
  const text = toVisibleText(input.html);
  const textVin = text.match(VIN_RE)?.[0]?.toUpperCase();
  const vin = pathVin ?? textVin;
  if (!vin) {
    throw new OrrPublicInventoryError("No VIN could be established from the public VDP.", "PARSE_FAILED");
  }

  const heading = extractVehicleHeading(text, input.sourceUrl);
  const stockNumber = normalizeValue(textAfterLabel(text, ["Stock #", "Stock Number"], 35))?.split(/\s+/)[0];

  const record = {
    source: SOURCE_NAME,
    sourceUrl: url.toString(),
    sourceVehicleId: vin,
    vin,
    stockNumber,
    year: heading.year,
    make: heading.make,
    model: heading.model,
    trim: heading.trim,
    condition: heading.condition,
    price: moneyAfterLabel(text, ["Y'ORR Price", "Your Price", "Price"]),
    msrp: moneyAfterLabel(text, ["MSRP"]),
    mileage: integerAfterLabel(text, ["Mileage"]),
    exteriorColor: normalizeValue(textAfterLabel(text, ["Exterior Color"], 50)),
    interiorColor: normalizeValue(textAfterLabel(text, ["Interior Color"], 50)),
    drivetrain: normalizeValue(textAfterLabel(text, ["Drivetrain"], 30)),
    transmission: normalizeValue(textAfterLabel(text, ["Transmission"], 40)),
    engine: normalizeValue(textAfterLabel(text, ["Engine"], 80)),
    fuelType: normalizeValue(textAfterLabel(text, ["Fuel Type"], 30)),
    cityMpg: integerAfterLabel(text, ["City MPG"]),
    highwayMpg: integerAfterLabel(text, ["Highway MPG"]),
    incentives: collectIncentives(text),
    fetchedAt: input.fetchedAt,
    sourceHash: sha256Utf8(input.html),
    parserVersion: ORR_PUBLIC_PARSER_VERSION,
  };

  if (!record.stockNumber || !record.year || !record.make || !record.model) {
    throw new OrrPublicInventoryError(
      "VDP identity fields are incomplete; fail closed instead of emitting a weak record.",
      "PARSE_FAILED",
    );
  }

  return record;
}

async function fetchBoundedPublicHtml(rawUrl: string, options: OrrPublicFetchOptions = {}) {
  const url = assertAllowedUrl(rawUrl);
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": options.userAgent ?? "NorAutoMatch-Inventory/1.0 (+read-only public inventory sync)",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new OrrPublicInventoryError("Redirect missing location.", "REDIRECT_NOT_ALLOWED");
      const redirectUrl = assertAllowedUrl(new URL(location, url).toString());
      if (redirectUrl.origin !== ORR_ORIGIN) {
        throw new OrrPublicInventoryError("Cross-origin redirect blocked.", "REDIRECT_NOT_ALLOWED");
      }
      return fetchBoundedPublicHtml(redirectUrl.toString(), options);
    }

    if (!response.ok) {
      throw new OrrPublicInventoryError(`Public inventory source returned HTTP ${response.status}.`, "HTTP_STATUS");
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new OrrPublicInventoryError(`Unexpected content type: ${contentType || "unknown"}.`, "CONTENT_TYPE");
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new OrrPublicInventoryError("Public source response exceeds configured byte limit.", "RESPONSE_TOO_LARGE");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new OrrPublicInventoryError("Public source response exceeded configured byte limit.", "RESPONSE_TOO_LARGE");
    }

    return {
      url: url.toString(),
      html: new TextDecoder().decode(buffer),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof OrrPublicInventoryError) throw error;
    throw new OrrPublicInventoryError(
      error instanceof Error ? `Public inventory fetch failed: ${error.message}` : "Public inventory fetch failed.",
      "FETCH_FAILED",
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverOrrPublicInventory(options: OrrPublicFetchOptions = {}): Promise<OrrPublicDiscovery> {
  const page = await fetchBoundedPublicHtml(ORR_ORIGIN, options);
  const vehicleUrls = discoverOrrVehicleUrlsFromHtml(page.html, page.url);
  return {
    sourceUrl: page.url,
    fetchedAt: page.fetchedAt,
    sourceHash: sha256Utf8(page.html),
    vehicleUrls,
  };
}

export async function fetchOrrPublicVehicle(
  sourceUrl: string,
  options: OrrPublicFetchOptions = {},
) {
  const page = await fetchBoundedPublicHtml(sourceUrl, options);
  return parseOrrVehicleDetailHtml({
    html: page.html,
    sourceUrl: page.url,
    fetchedAt: page.fetchedAt,
  });
}
