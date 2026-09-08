import { createHash } from "node:crypto";
import type { LiveInventoryRecord } from "./live-inventory";
import type { OrrAlgoliaDiscovery, OrrAlgoliaHit } from "./orr-public-algolia";

const SOURCE_NAME = "orrnissanwest_public_algolia";
const PARSER_VERSION = "orr-algolia-v1";
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
const DEALER_ID = 2175;

export type OrrAlgoliaNormalizationIssue = {
  objectID?: string;
  vin?: string;
  code:
    | "DEALER_MISMATCH"
    | "VIN_INVALID"
    | "IDENTITY_INCOMPLETE"
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
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value === "string" && value.trim()) return value.split("|").map((item) => item.trim()).filter(Boolean);
  return undefined;
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
  if (rebate) values.push(`Advertised rebate: $${rebate.toLocaleString("en-US")}`);
  return values;
}

export function normalizeOrrAlgoliaHit(
  hit: OrrAlgoliaHit,
  fetchedAt: string,
): { record?: LiveInventoryRecord; issue?: OrrAlgoliaNormalizationIssue } {
  const objectID = stringValue(hit.objectID) ?? (numberValue(hit.id)?.toString());
  const vin = stringValue(hit.vin)?.toUpperCase();

  if (Number(hit.dealer_id) !== DEALER_ID) {
    return { issue: { objectID, vin, code: "DEALER_MISMATCH", message: "Hit is outside dealer_id 2175." } };
  }
  if (!vin || !VIN_RE.test(vin)) {
    return { issue: { objectID, vin, code: "VIN_INVALID", message: "Hit does not contain a valid 17-character VIN." } };
  }
  if (hit.is_active === false || hit.archived === true || hit.on_hold === true) {
    return { issue: { objectID, vin, code: "INACTIVE_HIT", message: "Hit is not active inventory." } };
  }

  const year = numberValue(hit.make_year);
  const make = stringValue(hit.make);
  const model = stringValue(hit.model);
  const trim = stringValue(hit.car_trim);
  const stockNumber = stringValue(hit.stock_number);
  const price = positiveMoney(hit.price ?? hit.functional_price);

  if (!year || !make || !model || !trim || !stockNumber) {
    return { issue: { objectID, vin, code: "IDENTITY_INCOMPLETE", message: "Year/make/model/trim/stock identity is incomplete." } };
  }
  if (!price) {
    return { issue: { objectID, vin, code: "PRICE_INVALID", message: "Advertised price is missing, zero, negative, or non-numeric." } };
  }

  const record: LiveInventoryRecord = {
    source: SOURCE_NAME,
    sourceUrl: "https://orrnissanwest.com/inventory",
    sourceVehicleId: objectID,
    vin,
    stockNumber,
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
    features: stringArray(hit.parsed_features) ?? stringArray(hit.features),
    incentives: normalizeIncentives(hit),
    availabilityState: "ACTIVE_CURRENT",
    firstSeenAt: fetchedAt,
    lastSeenAt: fetchedAt,
    fetchedAt,
    sourceHash: hashCanonicalHit(hit),
    parserVersion: PARSER_VERSION,
    consecutiveHealthyMisses: 0,
  };

  return { record };
}

export function normalizeOrrAlgoliaDiscovery(discovery: OrrAlgoliaDiscovery): OrrAlgoliaNormalizationResult {
  const records: LiveInventoryRecord[] = [];
  const issues: OrrAlgoliaNormalizationIssue[] = [];
  const vins = new Set<string>();

  for (const hit of discovery.hits) {
    const normalized = normalizeOrrAlgoliaHit(hit, discovery.fetchedAt);
    if (normalized.issue) {
      issues.push(normalized.issue);
      continue;
    }
    const record = normalized.record!;
    if (vins.has(record.vin)) {
      issues.push({ objectID: stringValue(hit.objectID), vin: record.vin, code: "DUPLICATE_VIN", message: "Duplicate VIN found in one dealer snapshot." });
      continue;
    }
    vins.add(record.vin);
    records.push(record);
  }

  return { records: records.sort((a, b) => a.vin.localeCompare(b.vin)), issues };
}
