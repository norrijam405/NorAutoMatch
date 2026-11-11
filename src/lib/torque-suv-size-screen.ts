import type { Vehicle } from "./inventory";

/**
 * A conservative MODEL-FAMILY size screen for customers who explicitly ask
 * for a midsize/full-size SUV. This is a researched merchandising category
 * only, not VIN-backed dimensional certification or equipment evidence.
 *
 * Unknown or ambiguous models are excluded from the primary requested-size
 * shortlist. No automatic promotion based on bodyType="SUV".
 */
const SEGMENT_BY_MODEL: Record<string, Record<string, "SMALLER" | "MIDSIZE" | "FULL_SIZE">> = {
  nissan: { kicks:"SMALLER", rogue:"SMALLER", "rogue sport":"SMALLER", murano:"MIDSIZE", pathfinder:"MIDSIZE", armada:"FULL_SIZE", ariya:"SMALLER" },
  buick: { encore:"SMALLER", "encore gx":"SMALLER", envision:"SMALLER", enclave:"MIDSIZE" },
  toyota: { "corolla cross":"SMALLER", rav4:"SMALLER", venza:"SMALLER", highlander:"MIDSIZE", "grand highlander":"MIDSIZE", "4runner":"MIDSIZE", sequoia:"FULL_SIZE" },
  honda: { "hr-v":"SMALLER", "cr-v":"SMALLER", passport:"MIDSIZE", pilot:"MIDSIZE", prologue:"MIDSIZE" },
  hyundai: { kona:"SMALLER", tucson:"SMALLER", "santa fe":"MIDSIZE", palisade:"MIDSIZE" },
  kia: { seltos:"SMALLER", sportage:"SMALLER", sorento:"MIDSIZE", telluride:"MIDSIZE", niro:"SMALLER" },
  ford: { escape:"SMALLER", "bronco sport":"SMALLER", edge:"MIDSIZE", explorer:"MIDSIZE", expedition:"FULL_SIZE" },
  chevrolet: { trax:"SMALLER", trailblazer:"SMALLER", equinox:"SMALLER", blazer:"MIDSIZE", traverse:"MIDSIZE", tahoe:"FULL_SIZE", suburban:"FULL_SIZE" },
  mazda: { "cx-30":"SMALLER", "cx-5":"SMALLER", "cx-50":"SMALLER", "cx-70":"MIDSIZE", "cx-9":"MIDSIZE", "cx-90":"MIDSIZE" },
  subaru: { crosstrek:"SMALLER", forester:"SMALLER", outback:"SMALLER", ascent:"MIDSIZE" },
  jeep: { compass:"SMALLER", cherokee:"SMALLER", "grand cherokee":"MIDSIZE", wagoneer:"FULL_SIZE", "grand wagoneer":"FULL_SIZE" },
  volkswagen: { taos:"SMALLER", tiguan:"SMALLER", atlas:"MIDSIZE", "atlas cross sport":"MIDSIZE" },
  acura: { adx:"SMALLER", rdx:"SMALLER", mdx:"MIDSIZE" },
  lexus: { ux:"SMALLER", nx:"SMALLER", rx:"MIDSIZE", tx:"MIDSIZE", gx:"MIDSIZE", lx:"FULL_SIZE" },
  gmc: { terrain:"SMALLER", acadia:"MIDSIZE", yukon:"FULL_SIZE", "yukon xl":"FULL_SIZE" },
};
const norm = (s:string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
export type SuvModelSize = "SMALLER" | "MIDSIZE" | "FULL_SIZE" | "UNKNOWN";
export type RequestedSuvSize = "MIDSIZE" | "FULL_SIZE";
export function requestedSuvSize(text:string): RequestedSuvSize | null {
  if (!/\b(?:suv|crossover|sport utility)\b/i.test(text)) return null;
  if (/\b(?:mid[- ]?size(?:d)?)\b/i.test(text)) return "MIDSIZE";
  if (/\b(?:full[- ]?size(?:d)?)\b/i.test(text)) return "FULL_SIZE";
  return null;
}
export function modelFamilySuvSize(vehicle: Pick<Vehicle,"make"|"model">): SuvModelSize {
  const sizes=SEGMENT_BY_MODEL[vehicle.make.trim().toLowerCase()];
  if (!sizes) return "UNKNOWN";
  for (const [model,size] of Object.entries(sizes)) {
    if (norm(model) === norm(vehicle.model)) return size;
  }
  return "UNKNOWN";
}
export function filterSuvSizeModelCandidates(
  vehicles: readonly Vehicle[], requested: RequestedSuvSize,
): { candidates: Vehicle[]; smallerExcluded: number; unknownExcluded: number } {
  let smallerExcluded=0,unknownExcluded=0;
  const candidates=vehicles.filter(v=>{
    const size=modelFamilySuvSize(v);
    if (size === requested) return true;
    if (size === "UNKNOWN") unknownExcluded++;
    else smallerExcluded++;
    return false;
  });
  return {candidates,smallerExcluded,unknownExcluded};
}

/**
 * Resolve a customer-requested SUV size across a bounded in-session conversation.
 * The latest explicit request wins. Explicit small/compact withdrawals and
 * "start over" clear prior size without silently resurrecting an old constraint.
 */
export function conversationalRequestedSuvSize(history: string[], latest: string): RequestedSuvSize | null {
  let result: RequestedSuvSize | null = null;
  for (const message of [...history.slice(-10), latest]) {
    if (/\b(?:start over|new search|forget (?:all|everything)|reset my search)\b/i.test(message)) {
      result = null;
    }
    // Check negation BEFORE recognizing the same size word as a new request.
    if (/\b(?:no longer|don'?t|do not)\s+(?:need|want|require)\s+(?:a\s+)?(?:mid[- ]?size(?:d)?|full[- ]?size(?:d)?)\b/i.test(message)) {
      result = null;
    } else if (/\b(?:compact|small|subcompact)[- ]?(?:suv|crossover)\b/i.test(message) &&
      /\b(?:instead|actually|now|change|want|need|looking for)\b/i.test(message)) {
      result = null;
    } else {
      const explicit = requestedSuvSize(message);
      if (explicit) result = explicit;
    }
  }
  return result;
}
