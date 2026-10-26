import type { Vehicle } from "./inventory";

export type LifestyleIntent = {
  teen: boolean;
  small: boolean;
  sedan: boolean;
  suv: boolean;
  thirdRow: boolean;
  economy: boolean;
  affordable: boolean;
};

/** Translate broad shopping language into advisory preferences, not unsupported facts. */
export function interpretLifestyleSearch(query: string): LifestyleIntent | null {
  const text = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const teen = /\b(teen|teenager|teenage|new driver|first car|young driver)\b/.test(text);
  const small = /\b(small|compact|little|easy to park)\b/.test(text);
  const sedan = /\b(sedan|four door|4 door)\b/.test(text);
  const suv = /\b(suv|crossover|sport utility)\b/.test(text);
  const thirdRow = /\b(third row|3rd row|three row|7 seater|seven seater|7 passenger|seven passenger)\b/.test(text);
  const economy = /\b(good on gas|gas mileage|fuel efficient|fuel economy|good mpg|save on gas|economical)\b/.test(text);
  const affordable = /\b(affordable|budget friendly|inexpensive|cheap|low cost)\b/.test(text);
  if (!(teen || thirdRow || economy || affordable)) return null;
  if (!(sedan || suv || thirdRow)) return null;
  return { teen, small, sedan, suv, thirdRow, economy, affordable };
}

function verifiedThirdRow(vehicle: Vehicle) {
  return vehicle.features?.some((f) => /\b(third row|3rd row|7 passenger|8 passenger|seven passenger)\b/i.test(f)) ?? false;
}

export function lifestyleCandidates(vehicles: Vehicle[], intent: LifestyleIntent) {
  const compactModels = new Set(["versa", "sentra", "corolla", "civic", "elantra", "forte", "rio", "mazda3", "impreza", "jetta"]);
  return vehicles.filter((vehicle) => {
    if (intent.sedan && !/sedan/i.test(vehicle.type)) return false;
    if ((intent.suv || intent.thirdRow) && !/suv|crossover/i.test(vehicle.type)) return false;
    // Third-row seating must be attested by the feed; a model name is not enough.
    if (intent.thirdRow && !verifiedThirdRow(vehicle)) return false;
    return true;
  }).map((vehicle) => {
    const compact = compactModels.has(vehicle.model.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const mpg = vehicle.cityMpg != null && vehicle.highwayMpg != null
      && vehicle.cityMpg > 0 && vehicle.highwayMpg > 0
      ? Math.round(0.55 * vehicle.cityMpg + 0.45 * vehicle.highwayMpg) : null;
    const score = ((intent.small && compact) ? 100 : 0)
      + ((intent.economy && mpg !== null) ? mpg * 3 : 0)
      + ((intent.affordable && Number.isFinite(vehicle.price)) ? Math.max(0, 80000 - vehicle.price) / 500 : 0);
    return { vehicle, compact, mpg, score };
  }).sort((a,b) => b.score-a.score || a.vehicle.price-b.vehicle.price || a.vehicle.id.localeCompare(b.vehicle.id)).slice(0,8);
}

/** Backward-compatible wrapper retained for existing callers. */
export function lifestyleSedanCandidates(vehicles: Vehicle[], query: string) {
  const intent = interpretLifestyleSearch(query);
  return intent ? lifestyleCandidates(vehicles, intent) : [];
}
