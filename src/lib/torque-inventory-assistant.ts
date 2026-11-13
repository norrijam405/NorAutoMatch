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
  mileageVerified?: boolean;
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
  requestedSuvSize?: "MIDSIZE" | "FULL_SIZE" | null;
}): TorqueInventoryAnswer {
  const request = interpret(input.message, input.vehicles);
  const toMatch = (entry: ReturnType<typeof rankVehiclesForSalesSpec>[number]): TorqueVehicleMatch => ({
    id: entry.vehicle.id,
    label: [entry.vehicle.year, entry.vehicle.make, entry.vehicle.model, entry.vehicle.trim].filter(Boolean).join(" "),
    price: entry.vehicle.price,
    mileage: entry.vehicle.mileage,
    mileageVerified: entry.vehicle.mileageVerified,
    type: entry.vehicle.type,
    drivetrain: entry.vehicle.drivetrain,
    fit: entry.fit === "EXACT" ? "exact" : entry.fit === "STRONG" ? "strong" : "near",
    reasons: entry.reasons,
    compromises: entry.compromises,
  });
  const sizeRequested = input.requestedSuvSize !== undefined
    ? input.requestedSuvSize !== null
    : Boolean(input.spec?.freeformNotes.some(note => note.startsWith("Midsize SUV requested")));
  const sizeLabel = input.requestedSuvSize === "FULL_SIZE" ? "full-size" : "midsize";
  const evaluated = (input.spec
    ? rankVehiclesForSalesSpec({ requirements: input.spec, vehicles: input.vehicles, limit: 2_000, strictMustHaves: true }).map(toMatch)
    : input.vehicles.map((vehicle) => evaluateVehicle(vehicle, request)))
    .map((match) => sizeRequested
      ? { ...match, fit: "near" as const,
          compromises: [...match.compromises, "requested SUV size is model-family guidance; exact-VIN dimensions are not verified"] }
      : match);
  // An empty strict result should not become a dead end. Separately show the
  // closest *clearly labeled* vehicles, preserving price, body style, exact VIN,
  // and other identity constraints; never classify these as fulfilling hard specs.
  const alternativeCandidates: TorqueVehicleMatch[] =
    input.spec && evaluated.length === 0
      ? rankVehiclesForSalesSpec({
          requirements: input.spec, vehicles: input.vehicles, limit: 50, strictMustHaves: false,
        }).filter((entry) =>
          (!input.spec?.maxPrice || entry.vehicle.price <= input.spec.maxPrice.value) &&
          entry.hardMisses > 0
        ).slice(0, 3).map((entry) => ({ ...toMatch(entry), fit: "near" }))
      : [];
  const wantsEfficiency = Boolean(input.spec?.freeformNotes.some(note => note.startsWith("Fuel efficiency preference")) ||
    /\b(?:good on gas|gas mileage|fuel econom|better mpg|best mpg|fuel efficient)\b/i.test(input.message));
  const withEfficiencyEvidence = (match: TorqueVehicleMatch): TorqueVehicleMatch => {
    if (!wantsEfficiency) return match;
    const vehicle = input.vehicles.find(item => item.id === match.id);
    const highway = vehicle?.highwayMpg;
    const city = vehicle?.cityMpg;
    const mpgText = Number.isFinite(highway) && highway! > 0 && Number.isFinite(city) && city! > 0
      ? `Source-reported fuel economy: ${city} city / ${highway} highway MPG`
      : null;
    return {
      ...match,
      reasons: mpgText ? [...match.reasons, mpgText] : match.reasons,
      compromises: mpgText ? match.compromises : [...match.compromises, "fuel economy not established by this vehicle record"],
    };
  };
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
  const closest = alternativeCandidates.filter(candidate =>
    !exact.some(x => x.id === candidate.id) &&
    !strong.some(x => x.id === candidate.id) &&
    !near.some(x => x.id === candidate.id)
  );
  const matches = (exact.length > 0
    ? exact.slice(0, 5)
    : strong.length > 0
      ? strong.slice(0, 5)
      : near.length > 0
        ? near
        : closest).map(withEfficiencyEvidence);
  // State the specific evidence behind the FIRST eligible recommendation.
  // A match is not a promise of current availability or financing.
  const leading = matches[0];
  const matchExplanation = leading
    ? ` I'd start with the ${leading.label}.${leading.reasons.length
        ? " " + leading.reasons.slice(0, 2).join("; ") + "."
        : ""}${leading.compromises.length
        ? " Still to check: " + leading.compromises.slice(0, 2).join("; ") + "."
        : ""}`
    : "";

  let answer = "";
  if (exact.length > 0) {
    answer = `I found ${exact.length} ${exact.length === 1 ? "option" : "options"} that match your listed requirements.`;
  } else if (strong.length > 0) {
    answer = `I found ${strong.length} promising ${strong.length === 1 ? "option" : "options"}. Your must-haves are covered in the records, but some preferences differ.`;
  } else if (near.length > 0) {
    answer = `I found ${near.length} ${near.length === 1 ? "possibility" : "possibilities"}, but none checks every box yet. I'll show you what's missing.`;
  } else if (closest.length > 0) {
    answer = input.mode === "representative-demo"
      ? "The SAMPLE cars don't prove a full match. Here are a few examples; they're not confirmed dealership vehicles."
      : "I haven't confirmed a complete match. These are real dealer-listed possibilities, but the equipment or fuel-economy details still need checking.";
  } else {
    answer = input.mode === "representative-demo"
      ? "Nothing in the SAMPLE data confirms that fit. Those examples aren't the dealership's inventory."
      : "I couldn't confirm a match in the inventory I checked. That doesn't mean the dealership has none; we can have a salesperson check.";
  }

  if (leading) answer += matchExplanation;
  if (sizeRequested) {
    answer += " I'm keeping your " + sizeLabel + " SUV requirement. Size is based on the model family, not verified measurements for this VIN.";
  }

  // Keep MatchDNA in structured metadata; don't narrate internal profiling
  // to a shopper who asked a straightforward vehicle question.

  const handoffRequired = exact.length === 0 && strong.length === 0;
  const handoffSummary = handoffRequired
    ? buildHandoffSummary(request, input.dna, near)
    : undefined;

  if (handoffRequired && input.mode !== "representative-demo") {
    answer += " I checked Orr Nissan West only. A salesperson can check other Orr locations if you'd like.";
  }

  return {
    answer,
    mode: input.mode,
    exactCount: exact.length,
    nearCount: strong.length + near.length + closest.length,
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
    mileageVerified: vehicle.mileageVerified,
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
