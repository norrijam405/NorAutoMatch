import type { Vehicle } from "./inventory";

export type InventoryConstraintKind =
  | "year"
  | "make"
  | "model"
  | "bodyType"
  | "condition"
  | "color"
  | "drivetrain"
  | "feature";

export type InventoryConstraint = {
  kind: InventoryConstraintKind;
  value: string;
  label: string;
};

export type ParsedInventoryQuery = {
  raw: string;
  normalized: string;
  constraints: InventoryConstraint[];
  softTerms: string[];
};

export type InventorySearchMatch = {
  vehicle: Vehicle;
  kind: "exact" | "close";
  matched: string[];
  missing: string[];
  score: number;
};

export type InventorySearchResult = {
  parsed: ParsedInventoryQuery;
  exact: InventorySearchMatch[];
  close: InventorySearchMatch[];
};

type FeatureDefinition = {
  id: string;
  label: string;
  queryAliases: string[];
  evidenceTerms: string[];
};

export const INVENTORY_FEATURES: FeatureDefinition[] = [
  { id: "carplay", label: "Apple CarPlay", queryAliases: ["apple carplay", "carplay"], evidenceTerms: ["apple carplay", "carplay"] },
  { id: "heated-seats", label: "heated seats", queryAliases: ["heated front seats", "heated front seat", "heated seats", "heated seat"], evidenceTerms: ["heated front seat", "heated seat"] },
  { id: "leather", label: "leather seating", queryAliases: ["leather seats", "leather seat", "leather"], evidenceTerms: ["leather", "leatherette"] },
  { id: "sunroof", label: "sunroof / moonroof", queryAliases: ["panoramic roof", "moonroof", "sunroof"], evidenceTerms: ["panoramic roof", "moonroof", "sunroof"] },
  { id: "third-row", label: "3rd-row seating", queryAliases: ["third row", "3rd row"], evidenceTerms: ["third row", "3rd row", "7 passenger", "8 passenger"] },
];

const STOP_WORDS = new Set(["with", "and", "the", "a", "an", "that", "has", "have", "me", "show", "find"]);

const DRIVETRAINS = [
  { value: "AWD", label: "AWD", queryAliases: ["all wheel drive", "all-wheel drive", "awd"], evidenceTerms: ["awd", "all wheel drive"] },
  { value: "4WD", label: "4WD / 4x4", queryAliases: ["four wheel drive", "four-wheel drive", "4 wheel drive", "4wd", "4x4"], evidenceTerms: ["4wd", "4x4", "four wheel drive"] },
  { value: "FWD", label: "FWD", queryAliases: ["front wheel drive", "front-wheel drive", "fwd"], evidenceTerms: ["fwd", "front wheel drive"] },
  { value: "RWD", label: "RWD", queryAliases: ["rear wheel drive", "rear-wheel drive", "rwd"], evidenceTerms: ["rwd", "rear wheel drive"] },
] as const;

const COLOR_FAMILIES = [
  { value: "gun-metallic", label: "Gun Metallic", queryAliases: ["gun metallic", "gun metal", "gunmetal"], evidenceTerms: ["gun metallic", "gun metal", "gunmetal"] },
  { value: "red", label: "red exterior", queryAliases: ["red"], evidenceTerms: ["red", "scarlet", "crimson", "ruby", "burgundy", "maroon"] },
  { value: "black", label: "black exterior", queryAliases: ["black"], evidenceTerms: ["black", "obsidian", "midnight", "super black"] },
  { value: "white", label: "white exterior", queryAliases: ["white"], evidenceTerms: ["white", "pearl white", "ivory"] },
  { value: "gray", label: "gray exterior", queryAliases: ["grey", "gray"], evidenceTerms: ["gray", "grey", "gun metallic", "graphite", "charcoal"] },
  { value: "silver", label: "silver exterior", queryAliases: ["silver"], evidenceTerms: ["silver", "platinum"] },
  { value: "blue", label: "blue exterior", queryAliases: ["blue"], evidenceTerms: ["blue", "navy", "cobalt", "deep ocean"] },
  { value: "green", label: "green exterior", queryAliases: ["green"], evidenceTerms: ["green", "forest", "evergreen"] },
] as const;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasePresent(haystack: string, phrase: string) {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  return ` ${haystack} `.includes(` ${normalizedPhrase} `);
}

function findLongestPresent(values: string[], query: string) {
  return [...new Set(values.filter(Boolean))]
    .sort((a, b) => normalizeText(b).length - normalizeText(a).length || a.localeCompare(b))
    .find((value) => phrasePresent(query, value));
}

function colorConstraintForQuery(query: string) {
  return COLOR_FAMILIES.find((definition) => definition.queryAliases.some((alias) => phrasePresent(query, alias)));
}

function drivetrainConstraintForQuery(query: string) {
  return DRIVETRAINS.find((definition) => definition.queryAliases.some((alias) => phrasePresent(query, alias)));
}

function sourceFeatureText(vehicle: Vehicle) {
  return normalizeText(vehicle.features?.join(" ") ?? "");
}

export function vehicleHasFeature(vehicle: Vehicle, featureId: string) {
  const definition = INVENTORY_FEATURES.find((candidate) => candidate.id === featureId);
  if (!definition) return false;
  const sourceText = sourceFeatureText(vehicle);
  return definition.evidenceTerms.some((term) => phrasePresent(sourceText, term) || sourceText.includes(normalizeText(term)));
}

function vehicleMatchesDrivetrain(vehicle: Vehicle, value: string) {
  const definition = DRIVETRAINS.find((candidate) => candidate.value === value);
  if (!definition) return false;
  const source = normalizeText(vehicle.drivetrain);
  return definition.evidenceTerms.some((term) => phrasePresent(source, term) || source === normalizeText(term));
}

function vehicleMatchesColor(vehicle: Vehicle, value: string) {
  const definition = COLOR_FAMILIES.find((candidate) => candidate.value === value);
  if (!definition) return false;
  const source = normalizeText(vehicle.exteriorColor ?? vehicle.accent);
  return definition.evidenceTerms.some((term) => source.includes(normalizeText(term)));
}

function inventorySearchText(vehicle: Vehicle) {
  return normalizeText([
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.trim,
    vehicle.type,
    vehicle.condition,
    vehicle.exteriorColor,
    vehicle.interiorColor,
    vehicle.drivetrain,
    vehicle.features?.join(" "),
    vehicle.id,
  ].filter(Boolean).join(" "));
}

export function parseInventoryQuery(query: string, vehicles: Vehicle[]): ParsedInventoryQuery {
  const normalized = normalizeText(query);
  if (!normalized) return { raw: query, normalized, constraints: [], softTerms: [] };

  const constraints: InventoryConstraint[] = [];
  const consumed = new Set<string>();
  const consume = (value: string) => normalizeText(value).split(" ").filter(Boolean).forEach((token) => consumed.add(token));

  const year = normalized.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) {
    constraints.push({ kind: "year", value: year, label: year });
    consume(year);
  }

  const make = findLongestPresent(vehicles.map((vehicle) => vehicle.make), normalized);
  if (make) {
    constraints.push({ kind: "make", value: normalizeText(make), label: make });
    consume(make);
  }

  const model = findLongestPresent(vehicles.map((vehicle) => vehicle.model), normalized);
  if (model) {
    constraints.push({ kind: "model", value: normalizeText(model), label: model });
    consume(model);
  }

  const bodyType = findLongestPresent(vehicles.map((vehicle) => vehicle.type), normalized);
  if (bodyType) {
    constraints.push({ kind: "bodyType", value: normalizeText(bodyType), label: bodyType });
    consume(bodyType);
  }

  const condition = findLongestPresent(vehicles.map((vehicle) => vehicle.condition ?? ""), normalized);
  if (condition) {
    constraints.push({ kind: "condition", value: normalizeText(condition), label: condition });
    consume(condition);
  }

  const drivetrain = drivetrainConstraintForQuery(normalized);
  if (drivetrain) {
    constraints.push({ kind: "drivetrain", value: drivetrain.value, label: drivetrain.label });
    const usedAlias = drivetrain.queryAliases.find((alias) => phrasePresent(normalized, alias));
    if (usedAlias) consume(usedAlias);
  }

  const color = colorConstraintForQuery(normalized);
  if (color) {
    constraints.push({ kind: "color", value: color.value, label: color.label });
    const usedAlias = color.queryAliases.find((alias) => phrasePresent(normalized, alias));
    if (usedAlias) consume(usedAlias);
  } else {
    const exactSourceColor = findLongestPresent(
      vehicles.map((vehicle) => vehicle.exteriorColor ?? vehicle.accent).filter(Boolean),
      normalized,
    );
    if (exactSourceColor) {
      constraints.push({ kind: "color", value: `source:${normalizeText(exactSourceColor)}`, label: exactSourceColor });
      consume(exactSourceColor);
    }
  }

  for (const feature of INVENTORY_FEATURES) {
    const usedAlias = feature.queryAliases.find((alias) => phrasePresent(normalized, alias));
    if (!usedAlias) continue;
    constraints.push({ kind: "feature", value: feature.id, label: feature.label });
    consume(usedAlias);
  }

  const softTerms = normalized.split(" ").filter((token) => token && !STOP_WORDS.has(token) && !consumed.has(token));
  return { raw: query, normalized, constraints, softTerms };
}

function evaluateConstraint(vehicle: Vehicle, constraint: InventoryConstraint) {
  switch (constraint.kind) {
    case "year": return String(vehicle.year) === constraint.value;
    case "make": return normalizeText(vehicle.make) === constraint.value;
    case "model": return normalizeText(vehicle.model) === constraint.value;
    case "bodyType": return normalizeText(vehicle.type) === constraint.value;
    case "condition": return normalizeText(vehicle.condition) === constraint.value;
    case "drivetrain": return vehicleMatchesDrivetrain(vehicle, constraint.value);
    case "feature": return vehicleHasFeature(vehicle, constraint.value);
    case "color": {
      if (constraint.value.startsWith("source:")) {
        return normalizeText(vehicle.exteriorColor ?? vehicle.accent) === constraint.value.slice("source:".length);
      }
      return vehicleMatchesColor(vehicle, constraint.value);
    }
  }
}

function constraintWeight(kind: InventoryConstraintKind) {
  switch (kind) {
    case "model": return 100;
    case "make": return 60;
    case "year": return 30;
    case "color": return 25;
    case "drivetrain": return 25;
    case "feature": return 20;
    case "bodyType": return 15;
    case "condition": return 10;
  }
}

function missingExplanation(vehicle: Vehicle, constraint: InventoryConstraint) {
  switch (constraint.kind) {
    case "model": return `model differs: ${vehicle.model}`;
    case "make": return `make differs: ${vehicle.make}`;
    case "year": return `year differs: ${vehicle.year}`;
    case "color": return `exterior color differs: ${vehicle.exteriorColor ?? vehicle.accent ?? "not supplied"}`;
    case "drivetrain": return `drivetrain differs: ${vehicle.drivetrain || "not supplied"}`;
    case "feature": return `${constraint.label} is not listed by the source`;
    case "bodyType": return `body style differs: ${vehicle.type}`;
    case "condition": return `condition differs: ${vehicle.condition ?? "not supplied"}`;
  }
}

function stableVehicleTieBreak(a: Vehicle, b: Vehicle) {
  return b.year - a.year || a.price - b.price || a.id.localeCompare(b.id);
}

export function searchInventory(vehicles: Vehicle[], query: string): InventorySearchResult {
  const parsed = parseInventoryQuery(query, vehicles);
  if (!parsed.normalized) return {
    parsed,
    exact: vehicles.map((vehicle) => ({ vehicle, kind: "exact", matched: [], missing: [], score: 0 })),
    close: [],
  };

  if (parsed.constraints.length === 0) {
    const soft = vehicles
      .filter((vehicle) => parsed.softTerms.every((term) => inventorySearchText(vehicle).includes(term)))
      .sort(stableVehicleTieBreak)
      .map((vehicle) => ({ vehicle, kind: "exact" as const, matched: parsed.softTerms, missing: [], score: parsed.softTerms.length }));
    return { parsed, exact: soft, close: [] };
  }

  const evaluated = vehicles.map((vehicle) => {
    const matchedConstraints = parsed.constraints.filter((constraint) => evaluateConstraint(vehicle, constraint));
    const missingConstraints = parsed.constraints.filter((constraint) => !evaluateConstraint(vehicle, constraint));
    const softHits = parsed.softTerms.filter((term) => inventorySearchText(vehicle).includes(term));
    const score = matchedConstraints.reduce((sum, constraint) => sum + constraintWeight(constraint.kind), 0) + softHits.length;
    return {
      vehicle,
      matchedConstraints,
      missingConstraints,
      matched: [...matchedConstraints.map((constraint) => constraint.label), ...softHits],
      missing: missingConstraints.map((constraint) => missingExplanation(vehicle, constraint)),
      score,
    };
  });

  const exact = evaluated
    .filter((candidate) => candidate.missingConstraints.length === 0 && parsed.softTerms.every((term) => inventorySearchText(candidate.vehicle).includes(term)))
    .sort((a, b) => b.score - a.score || stableVehicleTieBreak(a.vehicle, b.vehicle))
    .map(({ vehicle, matched, missing, score }) => ({ vehicle, kind: "exact" as const, matched, missing, score }));

  const identityConstraints = parsed.constraints.filter((constraint) => constraint.kind === "model" || constraint.kind === "make");
  const close = evaluated
    .filter((candidate) => candidate.missingConstraints.length > 0)
    .filter((candidate) => candidate.matchedConstraints.length > 0)
    .filter((candidate) => identityConstraints.length === 0 || identityConstraints.every((constraint) => evaluateConstraint(candidate.vehicle, constraint)))
    .sort((a, b) => {
      if (a.missingConstraints.length !== b.missingConstraints.length) return a.missingConstraints.length - b.missingConstraints.length;
      if (a.score !== b.score) return b.score - a.score;
      return stableVehicleTieBreak(a.vehicle, b.vehicle);
    })
    .map(({ vehicle, matched, missing, score }) => ({ vehicle, kind: "close" as const, matched, missing, score }));

  return { parsed, exact, close };
}
