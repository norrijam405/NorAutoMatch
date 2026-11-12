import { parseTorqueSalesInventorySpec, type TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";

/** Client sends only short, in-session customer messages; server reconstructs facts.
 * Every retained requirement is from the customer's own words, not MatchDNA.
 */
export function readRecentCustomerMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-10).filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 400);
}

export function combinedCustomerSpec(history: string[], latest: string): TorqueSalesInventorySpec {
  const turns = [...history.slice(-10), latest];
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
    // Equipment withdrawals are separate from features. The parser can read
    // "leather" in a negative sentence, so remove old material and suppress
    // same-turn reintroduction unless the customer then affirmatively asks.
    const noLongerLeather = /\\b(?:no longer|don'?t|do not|not)\\s+(?:need|require|want|care about)\\s+(?:an?\\s+)?(?:genuine\\s+)?leather(?:\\s+seats?|\\s+interior|\\s+upholstery)?\\b/i.test(turn);
    if (noLongerLeather) withdrawn.push("interiorMaterial");
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
    // "I don't need leather, but I still want leather seats" is a
    // deliberate affirmative correction; respect the last explicit clause.
    if (noLongerLeather && /\\b(?:but|however|instead)\\s+(?:i\\s+)?(?:still\\s+)?(?:need|want|require|prefer)\\s+(?:genuine\\s+)?leather\\b/i.test(turn)) {
      withdrawn.splice(withdrawn.indexOf("interiorMaterial"), 1);
    }
    // Allow customers to retract specific equipment requests without silently
    // reintroducing them from the same negative sentence.
    const withdrawnFeatures = new Set<string>();
    const withdrawalClauses = turn.matchAll(
      /\b(?:no longer|don'?t|do not|not)\s+(?:need|require|want|care about)\s+([^.!?;]{1,120})/gi,
    );
    for (const [, clause] of withdrawalClauses) {
      // Only the explicitly negated part is withdrawn. "but I need a
      // sunroof" is an affirmative request and must remain eligible.
      const negativePart = clause.split(/\b(?:but|however|instead)\b/i)[0];
      if (/\b(?:sunroof|moonroof)\b/i.test(negativePart)) withdrawnFeatures.add("sunroof");
      if (/\bheated seats?\b/i.test(negativePart)) withdrawnFeatures.add("heated seats");
      if (/\b(?:third|3rd) row\b/i.test(negativePart)) withdrawnFeatures.add("third row");
      if (/\bpanoramic (?:roof|moonroof)\b/i.test(negativePart)) withdrawnFeatures.add("panoramic roof");
    }
    if (withdrawnFeatures.size) {
      result.features = result.features.filter(
        item => !withdrawnFeatures.has(item.value.toLowerCase()),
      );
      next.features = next.features.filter(
        item => !withdrawnFeatures.has(item.value.toLowerCase()),
      );
    }
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
  // Summarize only explicitly retained constraints. Behavioral MatchDNA is
  // deliberately excluded; preferred items are labeled as flexible.
  const format = (requirement: { value: string | number; priority: string } | undefined, suffix = "") =>
    requirement
      ? (requirement.priority === "PREFERRED" ? "Prefer " : "") + requirement.value + suffix
      : null;
  const items = [
    format(spec.make), format(spec.model),
    spec.bodyTypeAlternatives
      ? "SUV or minivan"
      : format(spec.bodyType),
    format(spec.condition),
    format(spec.fuelType, " fuel"),
    spec.seatingCapacity ? format(spec.seatingCapacity, " seats required") : null,
    spec.maxPrice ? "up to $" + spec.maxPrice.value.toLocaleString("en-US") : null,
    spec.maxMileage ? "under " + spec.maxMileage.value.toLocaleString("en-US") + " miles" : null,
    format(spec.drivetrain),
    format(spec.exteriorColor, " exterior"),
    format(spec.interiorColor, " interior"),
    format(spec.interiorMaterial, " seats"),
    ...spec.features.slice(0, 6).map(feature => format(feature)),
  ];
  return items.filter((item): item is string => Boolean(item)).slice(0, 16);
}
