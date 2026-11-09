/**
 * Dealer-listing scout. Reads only information shipped in the dealer's
 * existing public inventory response; does not scrape arbitrary URLs.
 * Descriptions are untrusted claims and must never override explicit
 * numeric provider MPG fields or VIN/availability gates.
 */
export type ListedMpgEvidence = {
  city?: number;
  highway?: number;
  combined?: number;
  basis: "DEALER_DESCRIPTION" | "DEALER_STRUCTURED";
};
const mpg = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 5 && n <= 150 ? n : undefined;
};
const text = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 4000) : undefined;

export function readPublicVehicleDescription(hit: Record<string, unknown>): string | undefined {
  for (const key of ["vehicle_description", "car_description", "description", "dealer_description", "vehicleDescription", "comments", "remarks"]) {
    const description = text(hit[key]);
    if (description) return description;
  }
  return undefined;
}

export function parseListingMpg(description: string | undefined): ListedMpgEvidence | null {
  if (!description) return null;
  // Require explicit MPG units and their city/highway descriptors, never
  // infer MPG from horsepower, odometer, or an EPA rating of another trim.
  const tokens = description.matchAll(/\b(\d{1,3}(?:\.\d)?)\s*(?:mpg\s*)?(city|highway|hwy|combined)\s*mpg\b|\b(city|highway|hwy|combined)\s*[:=\-]?\s*(\d{1,3}(?:\.\d)?)\s*mpg\b/gi);
  const found: { city?: number; highway?: number; combined?: number } = {};
  for (const item of tokens) {
    const name = (item[2] ?? item[3] ?? "").toLowerCase();
    const value = mpg(item[1] ?? item[4]);
    if (value === undefined) continue;
    const key = name === "hwy" ? "highway" : name as "city" | "highway" | "combined";
    found[key] ??= value;
  }
  // Common dealer detail layout: "City MPG: 28" and "Highway MPG: 35".
  for (const match of description.matchAll(/\b(city|highway|hwy|combined)\s*mpg\s*[:=\-]?\s*(\d{1,3}(?:\.\d)?)\b/gi)) {
    const key = match[1].toLowerCase() === "hwy" ? "highway" : match[1].toLowerCase() as "city" | "highway" | "combined";
    found[key] ??= mpg(match[2]);
  }
  const combinedLabelPair = description.match(/\bcity\s*\/\s*(?:hwy|highway)\s*(?:mpg)?\s*[:=\-]?\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*mpg\b/i);
  if (combinedLabelPair) {
    // A paired City/Highway label takes precedence. Otherwise the isolated
    // "Highway MPG: 28" substring could mislabel the CITY number as highway.
    found.city = mpg(combinedLabelPair[1]);
    found.highway = mpg(combinedLabelPair[2]);
  }
  // Recognize "28 city / 35 highway MPG" only as a paired metric.
  const pair = description.match(/\b(\d{1,3})\s*city\s*(?:\/|and|,|\|)\s*(\d{1,3})\s*(?:highway|hwy)\s*mpg\b/i);
  if (pair) {
    found.city ??= mpg(pair[1]);
    found.highway ??= mpg(pair[2]);
  }
  if (found.city === undefined && found.highway === undefined && found.combined === undefined) return null;
  return { ...found, basis: "DEALER_DESCRIPTION" };
}

export function resolveListingMpg(hit: Record<string, unknown>): ListedMpgEvidence | null {
  const structuredCity = mpg(hit.city_mpg) ?? mpg(hit.mpg_city) ?? mpg(hit.fuel_economy_city) ?? mpg(hit.cityMPG);
  const structuredHighway = mpg(hit.highway_mpg) ?? mpg(hit.mpg_highway) ?? mpg(hit.fuel_economy_highway) ?? mpg(hit.highwayMPG);
  const structuredCombined = mpg(hit.combined_mpg) ?? mpg(hit.mpg_combined);
  const fromDescription = parseListingMpg(readPublicVehicleDescription(hit));
  if (structuredCity === undefined && structuredHighway === undefined && structuredCombined === undefined) return fromDescription;
  return {
    city: structuredCity ?? fromDescription?.city,
    highway: structuredHighway ?? fromDescription?.highway,
    combined: structuredCombined ?? fromDescription?.combined,
    basis: structuredCity !== undefined || structuredHighway !== undefined ? "DEALER_STRUCTURED" : "DEALER_DESCRIPTION",
  };
}
