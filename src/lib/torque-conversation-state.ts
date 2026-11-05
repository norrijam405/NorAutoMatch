import { parseTorqueSalesInventorySpec, type TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";

/** Client sends only short, in-session customer messages; server reconstructs facts.
 * Every retained requirement is from the customer's own words, not MatchDNA.
 */
export function readRecentCustomerMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 600);
}

export function combinedCustomerSpec(history: string[], latest: string): TorqueSalesInventorySpec {
  const turns = [...history.slice(-6), latest];
  const result = parseTorqueSalesInventorySpec("");
  const scalarFields = [
    "vin", "stockNumber", "make", "model", "modelYear", "trim", "bodyType",
    "bodyTypeAlternatives", "condition", "maxPrice", "maxMileage", "exteriorColor", "interiorColor",
    "interiorMaterial", "drivetrain", "cabStyle", "bedLength", "seatingCapacity",
    "seatingLayout", "engine", "transmission", "fuelType", "towingMinimumLbs",
    "payloadMinimumLbs"
  ] as const;
  for (const turn of turns) {
    // Clear old constraints when the customer explicitly starts a new search.
    if (/\b(?:start over|new search|forget (?:all|everything)|reset my search)\b/i.test(turn)) {
      for (const field of scalarFields) delete result[field];
      result.packages = []; result.features = []; result.exclusions = []; result.freeformNotes = [];
    }
    // A customer withdrawing a requirement must never have it re-added merely
    // because the same word also appears in the withdrawal sentence.
    const withdrawn: Array<(typeof scalarFields)[number]> = [];
    if (/\b(?:no longer|don'?t|do not|not)\s+(?:need|require|want|care about)\s+(?:an?\s+)?(?:awd|4wd|4x4|four.wheel.drive|all.wheel.drive)\b/i.test(turn)) {
      withdrawn.push("drivetrain");
    }
    if (/\b(?:no longer|don'?t|do not|not)\s+(?:need|require|want)\s+(?:a\s+)?(?:fully?\s+electric|electric|ev)\b/i.test(turn)) {
      withdrawn.push("fuelType");
    }
    if (/\b(?:no longer|don'?t|do not|not)\s+(?:need|require|want)\s+(?:a\s+)?(?:seven|7)[- ]?(?:seater|seat|passenger)\b/i.test(turn)) {
      withdrawn.push("seatingCapacity");
    }
    for (const field of withdrawn) delete result[field];
    const next = parseTorqueSalesInventorySpec(turn);
    // The latest explicit style choice replaces, rather than stacks with,
    // an earlier single-style or flexible SUV/minivan choice.
    if (next.bodyTypeAlternatives) delete result.bodyType;
    if (next.bodyType) delete result.bodyTypeAlternatives;
    for (const field of scalarFields) {
      // Latest explicit value overrides prior requirement within the same category.
      if (next[field] !== undefined && !withdrawn.includes(field)) Object.assign(result, { [field]: next[field] });
    }
    // Keep each positive requirement only once, avoiding duplicative prompts.
    for (const field of ["features", "packages", "exclusions"] as const) {
      for (const value of next[field]) {
        const index = result[field].findIndex(existing => String(existing.value).toLowerCase() === String(value.value).toLowerCase());
        if (index < 0) result[field].push(value);
        else result[field][index] = value;
      }
    }
    result.freeformNotes = [...new Set([...result.freeformNotes, ...next.freeformNotes])].slice(-8);
  }
  return result;
}

export function customerSpecSummary(spec: TorqueSalesInventorySpec): string[] {
  const items = [
    spec.make?.value, spec.model?.value, spec.bodyTypeAlternatives ? "SUV or minivan" : spec.bodyType?.value,
    spec.fuelType?.value ? `${spec.fuelType.value} fuel` : null,
    spec.seatingCapacity?.value ? `${spec.seatingCapacity.value} seats required` : null,
    spec.maxPrice?.value ? `up to $${spec.maxPrice.value.toLocaleString("en-US")}` : null,
    spec.drivetrain?.value,
  ];
  return items.filter((item): item is string => Boolean(item)).slice(0, 7);
}
