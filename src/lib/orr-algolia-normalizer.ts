import { createHash } from "node:crypto";
import type { LiveInventoryRecord } from "./live-inventory";
import type { OrrAlgoliaDiscovery, OrrAlgoliaHit } from "./orr-public-algolia";

const SOURCE_NAME = "orrnissanwest_public_algolia";
const PARSER_VERSION = "orr-algolia-v7";
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
const DEALER_ID = 2175;
const RIDEMOTIVE_IMAGE_BASE = "https://images.app.ridemotive.com/";
const RIDEMOTIVE_IMAGE_ID_RE = /^[a-z0-9]{20,64}$/i;

export type OrrAlgoliaNormalizationIssue = {
  objectID?: string;
  vin?: string;
  severity: "WARNING" | "ERROR";
  code:
    | "DEALER_MISMATCH"
    | "VIN_INVALID"
    | "IDENTITY_INCOMPLETE"
    | "STOCK_NUMBER_MISSING"
    | "PRICE_INVALID"
    | "DUPLICATE_VIN"
    | "INACTIVE_HIT";
  message: string;
};

export type OrrAlgoliaNormalizationResult = {
  records: LiveInventoryRecord[];
  issues: OrrAlgoliaNormalizationIssue[];
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
}

function positiveMoney(value: unknown) {
  const number = numberValue(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  if (typeof value === "string" && value.trim()) return value.split(/[|\n]/).map((item) => item.trim()).filter(Boolean);
  return undefined;
}

function dealerIds(hit: OrrAlgoliaHit) {
  const values = Array.isArray(hit.dealer_ids) ? hit.dealer_ids : [];
  return values.map((value) => Number(value)).filter(Number.isFinite);
}

function belongsToOrrWest(hit: OrrAlgoliaHit) {
  const associated = dealerIds(hit);
  if (associated.length > 0) return associated.includes(DEALER_ID);
  return Number(hit.dealer_id) === DEALER_ID;
}

function collectFeatureStrings(hit: OrrAlgoliaHit) {
  const candidates: unknown[] = [
    hit.parsed_features,
    hit.features,
    hit.searchable_accessories,
    hit.accessories,
    hit.accessory_package,
    hit.floor_plan_features,
    hit.equipment_groups,
  ];
  const values = candidates.flatMap((candidate) => stringArray(candidate) ?? []);
  const deduped = new Map<string, string>();
  for (const value of values) {
    const key = value.toLowerCase().replace(/\s+/g, " ").trim();
    if (key && !deduped.has(key)) deduped.set(key, value);
  }
  return [...deduped.values()];
}

function validHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizePhotoValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (validHttpUrl(trimmed)) return trimmed;
  if (RIDEMOTIVE_IMAGE_ID_RE.test(trimmed)) return `${RIDEMOTIVE_IMAGE_BASE}${trimmed}`;
  return undefined;
}

function normalizePhotos(hit: OrrAlgoliaHit) {
  const candidates = [hit.images, hit.webp_images, hit.image_urls, hit.photos, hit.photo_urls, hit.processed_images];
  const values = candidates.flatMap((candidate) => stringArray(candidate) ?? []);
  return [...new Set(values.map(normalizePhotoValue).filter((value): value is string => Boolean(value)))].slice(0, 30);
}

function hashCanonicalHit(hit: OrrAlgoliaHit) {
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(hit)
    .filter(([key]) => key !== "_highlightResult")
    .sort(([a], [b]) => a.localeCompare(b))));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function normalizeIncentives(hit: OrrAlgoliaHit) {
  const values: string[] = [];
  const rebate = positiveMoney(hit.rebate_price);
  if (rebate) values.push(`Advertised rebate amount (eligibility not inferred): $${rebate.toLocaleString("en-US")}`);
  return values;
}

export function normalizeOrrAlgoliaHit(
  hit: OrrAlgoliaHit,
  fetchedAt: string,
): { record?: LiveInventoryRecord; issue?: OrrAlgoliaNormalizationIssue } {
  const objectID = stringValue(hit.objectID) ?? (numberValue(hit.id)?.toString());
  const vin = stringValue(hit.vin)?.toUpperCase();

  if (!belongsToOrrWest(hit)) {
    return { issue: { objectID, vin, severity: "ERROR", code: "DEALER_MISMATCH", message: "Hit is outside the public Orr Nissan West dealer association (dealer_ids includes 2175)." } };
  }
  if (!vin || !VIN_RE.test(vin)) {
    return { issue: { objectID, vin, severity: "ERROR", code: "VIN_INVALID", message: "Hit does not contain a valid 17-character VIN." } };
  }
  if (hit.is_active === false || hit.archived === true || hit.on_hold === true) {
    return { issue: { objectID, vin, severity: "ERROR", code: "INACTIVE_HIT", message: "Hit is not active inventory." } };
  }

  const year = numberValue(hit.make_year);
  const make = stringValue(hit.make);
  const model = stringValue(hit.model);
  const trim = stringValue(hit.car_trim);
  const stockNumber = stringValue(hit.stock_number);
  const price = positiveMoney(hit.price) ?? positiveMoney(hit.functional_price);

  if (!year || !make || !model || !trim) {
    return { issue: { objectID, vin, severity: "ERROR", code: "IDENTITY_INCOMPLETE", message: "Year/make/model/trim identity is incomplete." } };
  }
  if (!price) {
    return { issue: { objectID, vin, severity: "ERROR", code: "PRICE_INVALID", message: "No positive advertised/functional price is available." } };
  }

  const sourceStockStatus = stringValue(hit.stock_status);
  const inTransit = hit.in_transit === true || sourceStockStatus?.toLowerCase() === "in_transit";
  const photos = normalizePhotos(hit);
  const features = collectFeatureStrings(hit);
  const record: LiveInventoryRecord = {
    source: SOURCE_NAME,
    sourceUrl: "https://orrnissanwest.com/inventory",
    sourceVehicleId: objectID,
    vin,
    stockNumber,
    sourceStockStatus,
    inTransit,
    year,
    make,
    model,
    trim,
    condition: stringValue(hit.car_condition),
    price,
    msrp: positiveMoney(hit.msrp),
    mileage: numberValue(hit.odometer),
    exteriorColor: stringValue(hit.exterior_color),
    interiorColor: stringValue(hit.interior_color),
    drivetrain: stringValue(hit.drivetrain),
    transmission: stringValue(hit.transmission),
    engine: stringValue(hit.engine),
    fuelType: stringValue(hit.standardized_fuel_type) ?? stringValue(hit.fuel_type),
    cityMpg: numberValue(hit.city_mpg),
    highwayMpg: numberValue(hit.highway_mpg),
    bodyType: stringValue(hit.category) ?? stringValue(hit.body_subtype),
    photos: photos.length > 0 ? photos : undefined,
    features: features.length > 0 ? features : undefined,
    incentives: normalizeIncentives(hit),
    availabilityState: "ACTIVE_CURRENT",
    firstSeenAt: fetchedAt,
    lastSeenAt: fetchedAt,
    fetchedAt,
    sourceHash: hashCanonicalHit(hit),
    parserVersion: PARSER_VERSION,
    consecutiveHealthyMisses: 0,
  };

  return stockNumber
    ? { record }
    : {
        record,
        issue: {
          objectID,
          vin,
          severity: "WARNING",
          code: "STOCK_NUMBER_MISSING",
          message: "Public source omitted stock number; VIN identity retained without inventing a stock number.",
        },
      };
}

export function normalizeOrrAlgoliaDiscovery(discovery: OrrAlgoliaDiscovery): OrrAlgoliaNormalizationResult {
  const records: LiveInventoryRecord[] = [];
  const issues: OrrAlgoliaNormalizationIssue[] = [];
  const vins = new Set<string>();

  for (const hit of discovery.hits) {
    const normalized = normalizeOrrAlgoliaHit(hit, discovery.fetchedAt);
    if (normalized.issue) issues.push(normalized.issue);
    if (!normalized.record) continue;
    const record = normalized.record;
    if (vins.has(record.vin)) {
      issues.push({ objectID: stringValue(hit.objectID), vin: record.vin, severity: "ERROR", code: "DUPLICATE_VIN", message: "Duplicate VIN found in one dealer snapshot." });
      continue;
    }
    vins.add(record.vin);
    records.push(record);
  }

  return { records: records.sort((a, b) => a.vin.localeCompare(b.vin)), issues };
}
