import type { Vehicle } from "./inventory";
import type { MatchDnaSummary } from "./match-dna";
import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";
import { rankVehiclesForSalesSpec } from "./vehicle-hunt-inventory-matcher";

export type TorqueInventoryMode = "verified-live" | "verified-cache" | "representative-demo";

export type TorqueVehicleMatch = {
  id: string;
  label: string;
  price: number;
  mileage: number;
  type: string;
  drivetrain: string;
  fit: "exact" | "strong" | "near";
  reasons: string[];
  compromises: string[];
};

export type TorqueInventoryAnswer = {
  answer: string;
  mode: TorqueInventoryMode;
  exactCount: number;
  nearCount: number;
  matches: TorqueVehicleMatch[];
  handoff: {
    required: boolean;
    reason?: "NO_EXACT_LOCAL_MATCH";
    pipeline?: "Vehicle Sourcing";
    humanScope?: "ORR_AUTO_GROUP";
    summary?: string;
  };
  interpreted: {
    maxPrice?: number;
    bodyType?: string;
    drivetrain?: string;
    makes: string[];
    features: string[];
  };
};

const BODY_ALIASES: Record<string, string> = {
  suv: "SUV",
  crossover: "SUV",
  truck: "Truck",
  pickup: "Truck",
  sedan: "Sedan",
  car: "Sedan",
};

const FEATURE_PHRASES = [
  "heated seats",
  "heated steering wheel",
  "sunroof",
  "moonroof",
  "panoramic roof",
  "leather",
  "third row",
  "3rd row",
  "apple carplay",
  "android auto",
  "remote start",
  "navigation",
  "blind spot",
  "adaptive cruise",
];

export function answerTorqueInventory(input: {
  message: string;
  vehicles: Vehicle[];
  mode: TorqueInventoryMode;
  dna?: MatchDnaSummary;
  spec?: TorqueSalesInventorySpec;
}): TorqueInventoryAnswer {
  const request = interpret(input.message, input.vehicles);
  const evaluated = input.spec
    ? rankVehiclesForSalesSpec({ requirements: input.spec, vehicles: input.vehicles, limit: 50 }).map((entry) => ({
        id: entry.vehicle.id,
        label: [entry.vehicle.year, entry.vehicle.make, entry.vehicle.model, entry.vehicle.trim].filter(Boolean).join(" "),
        price: entry.vehicle.price,
        mileage: entry.vehicle.mileage,
        type: entry.vehicle.type,
        drivetrain: entry.vehicle.drivetrain,
        fit: entry.fit === "EXACT"
          ? "exact" as const
          : entry.fit === "STRONG"
            ? "strong" as const
            : "near" as const,
        reasons: entry.reasons,
        compromises: entry.compromises,
      }))
    : input.vehicles.map((vehicle) => evaluateVehicle(vehicle, request));
  // MatchDNA only breaks ties among vehicles in the same fit class and with
  // the same number of compromises. It must never override a MUST_HAVE
  // requirement, VIN identity, or inventory-source eligibility.
  const byVehicleId = new Map(input.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const dnaScore = (match: TorqueVehicleMatch): number => {
    const vehicle = byVehicleId.get(match.id);
    if (!vehicle || !input.dna?.signalCount) return 0;
    const normalizedTraits = input.dna.traits.map((trait) => trait.trim().toLowerCase());
    const supported = [vehicle.make, vehicle.type, vehicle.drivetrain, vehicle.condition]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase());
    return normalizedTraits.filter((trait) => supported.includes(trait)).length;
  };
  const compareMatch = (a: TorqueVehicleMatch, b: TorqueVehicleMatch) =>
    a.compromises.length - b.compromises.length ||
    dnaScore(b) - dnaScore(a) ||
    a.price - b.price;
  const exact = evaluated.filter((item) => item.fit === "exact").sort(compareMatch);
  const strong = evaluated.filter((item) => item.fit === "strong").sort(compareMatch);
  const near = evaluated.filter((item) => item.fit === "near").sort(compareMatch).slice(0, 5);
  const matches = exact.length > 0
    ? exact.slice(0, 5)
    : strong.length > 0
      ? strong.slice(0, 5)
      : near;

  const sourcePhrase =
    input.mode === "representative-demo"
      ? "representative inventory"
      : input.mode === "verified-cache"
        ? "the latest verified cached inventory"
        : "the current verified inventory";

  let answer = "";
  if (exact.length > 0) {
    answer =
      "Yeah — I found " +
      exact.length +
      " " +
      (exact.length === 1 ? "vehicle" : "vehicles") +
      " in " +
      sourcePhrase +
      " that " +
      (exact.length === 1 ? "matches" : "match") +
      " what you asked for without me quietly changing your requirements.";
  } else if (strong.length > 0) {
    answer =
      "I found " +
      strong.length +
      " strong " +
      (strong.length === 1 ? "match" : "matches") +
      " in " +
      sourcePhrase +
      ". Your must-haves are covered; I’m calling out the preferred items that differ instead of pretending they’re exact.";
  } else if (near.length > 0) {
    answer =
      "I don't have an exact or strong match in " +
      sourcePhrase +
      ". I found " +
      near.length +
      " close " +
      (near.length === 1 ? "option" : "options") +
      ", but I'm calling out the must-have compromises instead of pretending they're exact.";
  } else {
    answer = input.mode === "representative-demo"
      ? "I couldn't find that specification in the sample vehicles. This is a demonstration catalog, NOT Orr Nissan West's live inventory, so I cannot tell you whether the dealership has it. A salesperson must check the real stock or confirm the VIN."
      : "I couldn't find that specification in " + sourcePhrase +
        ". That only describes this checked catalog and does not prove the dealership has no such vehicle. Ask a salesperson to verify the specific stock or VIN.";
  }

  if (input.dna && input.dna.signalCount > 0) {
    answer += " Your MatchDNA currently says: " + input.dna.label.replace(/^Learning:\s*/i, "") + ".";
  }

  const handoffRequired = exact.length === 0 && strong.length === 0;
  const handoffSummary = handoffRequired
    ? buildHandoffSummary(request, input.dna, near)
    : undefined;

  if (handoffRequired && input.mode !== "representative-demo") {
    answer += " I only verified the Orr Nissan West inventory here. The broader Orr Auto Group may have more vehicles, so this should go to a human to check the wider network.";
  }

  return {
    answer,
    mode: input.mode,
    exactCount: exact.length,
    nearCount: strong.length + near.length,
    matches,
    handoff: handoffRequired
      ? {
          required: true,
          reason: "NO_EXACT_LOCAL_MATCH",
          pipeline: "Vehicle Sourcing",
          humanScope: "ORR_AUTO_GROUP",
          summary: handoffSummary,
        }
      : { required: false },
    interpreted: request,
  };
}

function interpret(message: string, vehicles: Vehicle[]) {
  const text = message.toLowerCase();
  const maxPrice = parsePriceCeiling(text);
  const bodyType = Object.entries(BODY_ALIASES).find(([needle]) => text.includes(needle))?.[1];
  const drivetrain = text.includes("awd")
    ? "AWD"
    : text.includes("4wd") || text.includes("4x4")
      ? "4WD"
      : text.includes("fwd")
        ? "FWD"
        : undefined;

  const knownMakes = [...new Set(vehicles.map((vehicle) => vehicle.make).filter(Boolean))];
  const makes = knownMakes.filter((make) => text.includes(make.toLowerCase()));
  const features = FEATURE_PHRASES.filter((feature) => text.includes(feature));
  return { maxPrice, bodyType, drivetrain, makes, features };
}

function parsePriceCeiling(text: string) {
  const under = text.match(
    /(?:under|below|less than|max(?:imum)?|up to)\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand)?/i,
  );
  if (!under) return undefined;
  const raw = Number(under[1]);
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return under[2] ? Math.round(raw * 1000) : raw < 1000 ? Math.round(raw * 1000) : Math.round(raw);
}

function evaluateVehicle(vehicle: Vehicle, request: ReturnType<typeof interpret>): TorqueVehicleMatch {
  const reasons: string[] = [];
  const compromises: string[] = [];

  if (request.maxPrice !== undefined) {
    if (vehicle.price <= request.maxPrice) {
      reasons.push("within $" + request.maxPrice.toLocaleString() + " budget");
    } else {
      compromises.push("$" + (vehicle.price - request.maxPrice).toLocaleString() + " over budget");
    }
  }

  if (request.bodyType) {
    if (normalize(vehicle.type) === normalize(request.bodyType)) {
      reasons.push(request.bodyType + " body style");
    } else {
      compromises.push("is " + vehicle.type + ", not " + request.bodyType);
    }
  }

  if (request.drivetrain) {
    if (driveMatches(vehicle.drivetrain, request.drivetrain)) {
      reasons.push(request.drivetrain + " drivetrain");
    } else {
      compromises.push(vehicle.drivetrain + " instead of " + request.drivetrain);
    }
  }

  if (request.makes.length > 0) {
    if (request.makes.some((make) => normalize(make) === normalize(vehicle.make))) {
      reasons.push(vehicle.make + " requested brand");
    } else {
      compromises.push(vehicle.make + " is outside requested brand");
    }
  }

  for (const feature of request.features) {
    const haystack = (vehicle.features ?? []).join(" ").toLowerCase();
    if (featureMatches(haystack, feature)) {
      reasons.push(feature);
    } else {
      compromises.push("no source evidence for " + feature);
    }
  }

  return {
    id: vehicle.id,
    label: [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" "),
    price: vehicle.price,
    mileage: vehicle.mileage,
    type: vehicle.type,
    drivetrain: vehicle.drivetrain,
    fit: compromises.length === 0 ? "exact" : "near",
    reasons,
    compromises,
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function driveMatches(actual: string, requested: string) {
  const a = normalize(actual);
  const r = normalize(requested);
  if (r === "4wd") return a === "4wd" || a === "4x4";
  if (r === "awd") return a === "awd";
  return a === r;
}

function featureMatches(haystack: string, feature: string) {
  const synonyms: Record<string, string[]> = {
    sunroof: ["sunroof", "moonroof", "panoramic"],
    moonroof: ["moonroof", "sunroof", "panoramic"],
    "panoramic roof": ["panoramic roof", "panoramic moonroof", "dual panel"],
    "third row": ["third row", "3rd row"],
    "3rd row": ["third row", "3rd row"],
    "heated steering wheel": ["heated steering wheel"],
    "heated seats": ["heated seat"],
  };
  return (synonyms[feature] ?? [feature]).some((needle) => haystack.includes(needle));
}


function buildHandoffSummary(
  request: ReturnType<typeof interpret>,
  dna: MatchDnaSummary | undefined,
  near: TorqueVehicleMatch[],
) {
  const requirements = [
    request.maxPrice !== undefined ? "max $" + request.maxPrice.toLocaleString() : undefined,
    request.bodyType,
    request.drivetrain,
    request.makes.length > 0 ? "makes: " + request.makes.join(", ") : undefined,
    request.features.length > 0 ? "features: " + request.features.join(", ") : undefined,
  ].filter((value): value is string => Boolean(value));

  const nearSummary = near.slice(0, 3).map((match) =>
    match.label + " [" + match.compromises.join("; ") + "]",
  );

  const parts = [
    "Torque network sourcing request.",
    requirements.length > 0 ? "Customer requirements: " + requirements.join(" · ") + "." : "Customer described a vehicle need without structured hard limits.",
    dna && dna.signalCount > 0 ? "MatchDNA: " + dna.label + "." : undefined,
    nearSummary.length > 0 ? "Closest Orr Nissan West options: " + nearSummary.join(" | ") + "." : "No close Orr Nissan West option was identified.",
    "Check broader Orr Auto Group inventory. Do not treat local no-match as group-wide no-match.",
  ].filter((value): value is string => Boolean(value));

  return parts.join(" ");
}
