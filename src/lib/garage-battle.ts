import type { Vehicle } from "./inventory";

export type BattleEvidence = {
  source: "dealer-inventory" | "manufacturer-spec";
  label: string;
  url?: string;
};

export type BattleSignal = {
  id: string;
  title: string;
  vehicleId?: string;
  text: string;
  evidence: BattleEvidence[];
};

export type GarageBattleStory = {
  headline: string;
  signals: BattleSignal[];
  evidenceGaps: string[];
  decisionPrompt: string;
};

type ModelSpec = {
  make: string;
  model: string;
  year: number;
  seatingCapacity: number;
  exteriorLengthIn?: number;
  cargoRearSeatsUpMinCuFt?: number;
  cargoRearSeatsUpMaxCuFt?: number;
  sourceUrl: string;
  sourceLabel: string;
};

// Manufacturer facts are intentionally narrow, model-year bounded, and used only
// when the inventory identity matches exactly. Values below come from Nissan USA
// model-year specification material, not from generalized model knowledge.
const MODEL_SPECS: ModelSpec[] = [
  {
    make: "Nissan",
    model: "Rogue",
    year: 2025,
    seatingCapacity: 5,
    cargoRearSeatsUpMinCuFt: 36.3,
    cargoRearSeatsUpMaxCuFt: 36.5,
    sourceUrl: "https://www.nissanusa.com/content/dam/Nissan/us/vehicle-brochures/2025/2025-nissan-rogue-brochure-en.pdf",
    sourceLabel: "2025 Nissan Rogue brochure",
  },
  {
    make: "Nissan",
    model: "Kicks",
    year: 2025,
    seatingCapacity: 5,
    exteriorLengthIn: 171.9,
    cargoRearSeatsUpMinCuFt: 23.9,
    cargoRearSeatsUpMaxCuFt: 30.0,
    sourceUrl: "https://www.nissanusa.com/content/dam/Nissan/us/vehicle-brochures/2025/2025-nissan-kicks-brochure-en.pdf",
    sourceLabel: "2025 Nissan Kicks brochure",
  },
  {
    make: "Nissan",
    model: "Rogue",
    year: 2026,
    seatingCapacity: 5,
    exteriorLengthIn: 183,
    cargoRearSeatsUpMinCuFt: 36.3,
    cargoRearSeatsUpMaxCuFt: 36.5,
    sourceUrl: "https://www.nissanusa.com/vehicles/crossovers-suvs/rogue/specs-trims.html",
    sourceLabel: "2026 Nissan Rogue specs",
  },
  {
    make: "Nissan",
    model: "Kicks",
    year: 2026,
    seatingCapacity: 5,
    exteriorLengthIn: 171.9,
    cargoRearSeatsUpMinCuFt: 23.9,
    cargoRearSeatsUpMaxCuFt: 30.0,
    sourceUrl: "https://www.nissanusa.com/content/dam/Nissan/us/vehicle-brochures/2026/2026-nissan-kicks-brochure-en.pdf",
    sourceLabel: "2026 Nissan Kicks brochure",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function modelSpec(vehicle: Vehicle) {
  return MODEL_SPECS.find((spec) =>
    spec.year === vehicle.year &&
    normalize(spec.make) === normalize(vehicle.make) &&
    normalize(spec.model) === normalize(vehicle.model),
  );
}

function dealerEvidence(): BattleEvidence {
  return { source: "dealer-inventory", label: "verified dealer inventory record" };
}

function manufacturerEvidence(spec: ModelSpec): BattleEvidence {
  return { source: "manufacturer-spec", label: spec.sourceLabel, url: spec.sourceUrl };
}

function vehicleName(vehicle: Vehicle) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function driveTractionSignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  const traction = (vehicle: Vehicle) => /\b(awd|4wd|4x4|all wheel|four wheel)\b/i.test(vehicle.drivetrain);
  const aTraction = traction(a);
  const bTraction = traction(b);
  if (aTraction === bTraction) return undefined;
  const winner = aTraction ? a : b;
  return {
    id: "traction",
    title: "Weather / loose-surface flexibility",
    vehicleId: winner.id,
    text: `${vehicleName(winner)} is the one of these two whose verified inventory record lists ${winner.drivetrain}. If extra driven wheels matter for your weather or route, that is a real differentiator here—not a universal reason to choose it.`,
    evidence: [dealerEvidence()],
  };
}

function fuelEconomySignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  if (!finite(a.highwayMpg) || !finite(b.highwayMpg) || a.highwayMpg === b.highwayMpg) return undefined;
  const winner = a.highwayMpg > b.highwayMpg ? a : b;
  const loser = winner.id === a.id ? b : a;
  return {
    id: "highway-mpg",
    title: "Long-drive fuel economy",
    vehicleId: winner.id,
    text: `${vehicleName(winner)} is listed at ${winner.highwayMpg} highway mpg versus ${loser.highwayMpg} for ${vehicleName(loser)} in these dealer-source records. That can matter if highway miles dominate your week; real-world mileage varies.`,
    evidence: [dealerEvidence()],
  };
}

function cityEconomySignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  if (!finite(a.cityMpg) || !finite(b.cityMpg) || a.cityMpg === b.cityMpg) return undefined;
  const winner = a.cityMpg > b.cityMpg ? a : b;
  const loser = winner.id === a.id ? b : a;
  return {
    id: "city-mpg",
    title: "Stop-and-go efficiency",
    vehicleId: winner.id,
    text: `${vehicleName(winner)} is listed at ${winner.cityMpg} city mpg versus ${loser.cityMpg} for ${vehicleName(loser)} in these source records. If most of your driving is in town, that difference belongs in the decision.`,
    evidence: [dealerEvidence()],
  };
}

function advertisedPriceSignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  if (!finite(a.price) || !finite(b.price) || a.price <= 0 || b.price <= 0 || a.price === b.price) return undefined;
  const lower = a.price < b.price ? a : b;
  const higher = lower.id === a.id ? b : a;
  return {
    id: "advertised-price",
    title: "Up-front advertised price",
    vehicleId: lower.id,
    text: `${vehicleName(lower)} is advertised ${money(higher.price - lower.price)} lower than ${vehicleName(higher)} in the current verified inventory records (${money(lower.price)} vs ${money(higher.price)}). That is a price comparison only—not a payment, approval, out-the-door quote, or total-cost claim.`,
    evidence: [dealerEvidence()],
  };
}

function cargoSignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  const aSpec = modelSpec(a);
  const bSpec = modelSpec(b);
  if (!aSpec || !bSpec) return undefined;
  if (!finite(aSpec.cargoRearSeatsUpMinCuFt) || !finite(aSpec.cargoRearSeatsUpMaxCuFt) || !finite(bSpec.cargoRearSeatsUpMinCuFt) || !finite(bSpec.cargoRearSeatsUpMaxCuFt)) return undefined;

  let roomier: Vehicle | undefined;
  let roomierSpec: ModelSpec | undefined;
  let other: Vehicle | undefined;
  let otherSpec: ModelSpec | undefined;
  if (aSpec.cargoRearSeatsUpMinCuFt > bSpec.cargoRearSeatsUpMaxCuFt) {
    roomier = a; roomierSpec = aSpec; other = b; otherSpec = bSpec;
  } else if (bSpec.cargoRearSeatsUpMinCuFt > aSpec.cargoRearSeatsUpMaxCuFt) {
    roomier = b; roomierSpec = bSpec; other = a; otherSpec = aSpec;
  }
  if (!roomier || !roomierSpec || !other || !otherSpec) return undefined;

  return {
    id: "cargo",
    title: "Family / gear space",
    vehicleId: roomier.id,
    text: `${vehicleName(roomier)} has the stronger rear-seat-up cargo case for this model year: Nissan lists ${roomierSpec.cargoRearSeatsUpMinCuFt}–${roomierSpec.cargoRearSeatsUpMaxCuFt} cu. ft., versus ${otherSpec.cargoRearSeatsUpMinCuFt}–${otherSpec.cargoRearSeatsUpMaxCuFt} cu. ft. for ${vehicleName(other)}. If strollers, groceries, luggage, or sports gear routinely fill the back, that is the more useful direction. Exact capacity can vary by configuration.`,
    evidence: [manufacturerEvidence(roomierSpec), manufacturerEvidence(otherSpec)],
  };
}

function parkingSignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  const aSpec = modelSpec(a);
  const bSpec = modelSpec(b);
  if (!aSpec || !bSpec || !finite(aSpec.exteriorLengthIn) || !finite(bSpec.exteriorLengthIn) || aSpec.exteriorLengthIn === bSpec.exteriorLengthIn) return undefined;
  const shorter = aSpec.exteriorLengthIn < bSpec.exteriorLengthIn ? a : b;
  const shorterSpec = shorter.id === a.id ? aSpec : bSpec;
  const longer = shorter.id === a.id ? b : a;
  const longerSpec = shorter.id === a.id ? bSpec : aSpec;
  const delta = Math.abs(longerSpec.exteriorLengthIn! - shorterSpec.exteriorLengthIn!);
  return {
    id: "footprint",
    title: "City / parking footprint",
    vehicleId: shorter.id,
    text: `${vehicleName(shorter)} is ${delta.toFixed(1)} inches shorter overall by Nissan's model-year specs (${shorterSpec.exteriorLengthIn} in. vs ${longerSpec.exteriorLengthIn} in.). That smaller footprint can be useful in tight garages and parking spaces; it does not by itself prove easier parking in every situation.`,
    evidence: [manufacturerEvidence(shorterSpec), manufacturerEvidence(longerSpec)],
  };
}

function seatingSignal(a: Vehicle, b: Vehicle): BattleSignal | undefined {
  const aSpec = modelSpec(a);
  const bSpec = modelSpec(b);
  if (!aSpec || !bSpec || aSpec.seatingCapacity === bSpec.seatingCapacity) return undefined;
  const roomier = aSpec.seatingCapacity > bSpec.seatingCapacity ? a : b;
  const spec = roomier.id === a.id ? aSpec : bSpec;
  const other = roomier.id === a.id ? b : a;
  const otherSpec = roomier.id === a.id ? bSpec : aSpec;
  return {
    id: "seating",
    title: "Passenger count",
    vehicleId: roomier.id,
    text: `${vehicleName(roomier)} is rated for ${spec.seatingCapacity} occupants versus ${otherSpec.seatingCapacity} for ${vehicleName(other)}.`,
    evidence: [manufacturerEvidence(spec), manufacturerEvidence(otherSpec)],
  };
}

export function buildGarageBattleStory(a: Vehicle, b: Vehicle): GarageBattleStory {
  const signals = [
    cargoSignal(a, b),
    parkingSignal(a, b),
    seatingSignal(a, b),
    fuelEconomySignal(a, b),
    cityEconomySignal(a, b),
    driveTractionSignal(a, b),
    advertisedPriceSignal(a, b),
  ].filter((signal): signal is BattleSignal => Boolean(signal));

  const gaps: string[] = [];
  const aSpec = modelSpec(a);
  const bSpec = modelSpec(b);
  if (!aSpec || !bSpec) {
    gaps.push("Cargo, seating, and exterior-dimension claims are withheld unless both vehicles have exact model-year manufacturer specification evidence.");
  } else {
    if (!signals.some((signal) => signal.id === "cargo")) gaps.push("The available model-year evidence does not establish a clear cargo-space advantage for this exact pair.");
    if (!signals.some((signal) => signal.id === "footprint")) gaps.push("The available model-year evidence does not establish a clear overall-length advantage for this exact pair.");
  }
  if (!finite(a.cityMpg) || !finite(b.cityMpg) || !finite(a.highwayMpg) || !finite(b.highwayMpg)) {
    gaps.push("Fuel-economy comparison is incomplete because both VIN records do not provide city/highway mpg.");
  }

  return {
    headline: `${vehicleName(a)} vs ${vehicleName(b)}: which fits your life?`,
    signals,
    evidenceGaps: gaps,
    decisionPrompt: "Pick the tradeoff that actually describes your week: more room, smaller footprint, traction, fuel economy, or lower advertised price. NorAuto does not declare a universal winner.",
  };
}
