import type { Vehicle } from "./inventory";

/**
 * Recognize known SUV/CUV model families when a dealer feed uses a broad
 * accounting category like "Station Wagon". This is MODEL classification,
 * not proof of the exact VIN's equipment, trim or vehicle size segment.
 */
const MODEL_FAMILIES: Record<string, readonly string[]> = {
  nissan: ["rogue","rogue sport","murano","pathfinder","armada","kicks","ariya"],
  toyota: ["rav4","highlander","grand highlander","4runner","sequoia","corolla cross","venza","bz4x"],
  honda: ["cr-v","hr-v","pilot","passport","prologue"],
  hyundai: ["tucson","santa fe","palisade","kona","ioniq 5","ioniq 9"],
  kia: ["sportage","sorento","telluride","seltos","niro","ev6","ev9"],
  mazda: ["cx-3","cx-30","cx-5","cx-50","cx-70","cx-9","cx-90"],
  subaru: ["forester","crosstrek","ascent","solterra"],
  ford: ["escape","edge","explorer","expedition","bronco","bronco sport","mustang mach-e"],
  chevrolet: ["equinox","trax","trailblazer","blazer","traverse","tahoe","suburban"],
  jeep: ["compass","cherokee","grand cherokee","wrangler","wagoneer"],
  lexus: ["ux","nx","rx","tx","gx","lx"],
  volkswagen: ["tiguan","atlas","atlas cross sport","taos","id.4"],
  acura: ["rdx","mdx","adx","zdx"],
};
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g,"");
export function isSuvModelFamily(vehicle: Pick<Vehicle,"make"|"model">): boolean {
  const models=MODEL_FAMILIES[vehicle.make.toLowerCase().trim()]??[];
  return models.some(model=>norm(model)===norm(vehicle.model));
}
export function isSuvCandidate(vehicle: Pick<Vehicle,"type"|"make"|"model">): boolean {
  return /\b(?:suv|crossover|cross-over|sport\s*utility)\b/i.test(vehicle.type) ||
    isSuvModelFamily(vehicle);
}
export function suvCategoryEvidence(vehicle: Pick<Vehicle,"type"|"make"|"model">): string {
  return /\b(?:suv|crossover|cross-over|sport\s*utility)\b/i.test(vehicle.type)
    ? "dealer-listed SUV body category"
    : "known SUV model family; dealer body category is " + vehicle.type;
}
