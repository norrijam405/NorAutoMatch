import type { Vehicle } from "./inventory";

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const vin = (id: string) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(id);

/**
 * Resolve two vehicle names the customer actually typed, not presumed "favorites".
 * Requires exactly two distinguishable model mentions from the current verified catalog.
 * No fuzzy guesses and no substitutions when a model is absent.
 */
export function comparisonRequested(message: string) {
  return /\b(?:compare|comparison|versus|vs\.?|better|which (?:one|car|vehicle)|between|or)\b/i.test(message);
}

export function namedComparison(message: string, vehicles: Vehicle[]) {
  if (!comparisonRequested(message)) return null;
  const text = ` ${norm(message)} `;
  const modelNames = [...new Map(
    vehicles.filter(v => vin(v.id)).map(v => [norm(`${v.make} ${v.model}`), { make: v.make, model: v.model }])
  ).entries()].sort((a,b) => b[0].length - a[0].length);
  const found: { make: string; model: string; index: number }[] = [];
  let remaining = text;
  for (const [full, identity] of modelNames) {
    // Accept "Rogue" by itself only if it identifies one make/model in this catalog.
    const model = norm(identity.model);
    const allForModel = modelNames.filter(([, item]) => norm(item.model) === model);
    const searchTerms = [full, ...(allForModel.length === 1 ? [model] : [])];
    const term = searchTerms.find(value => value && remaining.includes(` ${value} `));
    if (!term) continue;
    const index = text.indexOf(` ${term} `);
    found.push({ ...identity, index });
    remaining = remaining.replace(` ${term} `, " ");
  }
  if (found.length !== 2) return null;
  found.sort((a,b) => a.index - b.index);
  const pick = (make:string, model:string) => vehicles
    .filter(v => vin(v.id) && norm(v.make) === norm(make) && norm(v.model) === norm(model))
    .sort((a,b) => b.year - a.year || a.price - b.price || a.id.localeCompare(b.id));
  const first = pick(found[0].make, found[0].model);
  const second = pick(found[1].make, found[1].model);
  if (!first.length || !second.length) return null;
  return {
    vehicles: [first[0], second[0]] as [Vehicle, Vehicle],
    counts: [first.length, second.length] as [number, number],
  };
}
