import type { Vehicle } from "./inventory";
import type { TorqueRequirementPriority, TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";
import type { VehicleHuntCandidate } from "./vehicle-hunt";

export type SalesSpecVehicleEvaluation = {
  vehicle: Vehicle;
  fit: "EXACT" | "STRONG" | "NEAR";
  reasons: string[];
  compromises: string[];
  hardMisses: number;
  softMisses: number;
};

export function rankVehiclesForSalesSpec(input: {
  requirements: TorqueSalesInventorySpec;
  vehicles: Vehicle[];
  limit?: number;
}): SalesSpecVehicleEvaluation[] {
  const limit = Math.max(1, Math.min(input.limit ?? 12, 50));
  const fitRank = { EXACT: 0, STRONG: 1, NEAR: 2 };

  return input.vehicles
    .filter((vehicle) => identityRequirementsMatch(input.requirements, vehicle))
    .map((vehicle) => {
      const evaluation = evaluateVehicle(input.requirements, vehicle);
      return {
        vehicle,
        fit: classifyFit(evaluation),
        reasons: evaluation.reasons,
        compromises: evaluation.compromises,
        hardMisses: evaluation.hardMisses,
        softMisses: evaluation.softMisses,
      };
    })
    .filter((entry) => entry.hardMisses <= 2)
    .sort((a, b) => {
      const fitDelta = fitRank[a.fit] - fitRank[b.fit];
      if (fitDelta !== 0) return fitDelta;
      const hardDelta = a.hardMisses - b.hardMisses;
      if (hardDelta !== 0) return hardDelta;
      const softDelta = a.softMisses - b.softMisses;
      if (softDelta !== 0) return softDelta;
      return a.vehicle.price - b.vehicle.price;
    })
    .slice(0, limit);
}

export function matchVehicleHuntToLocalInventory(input: {
  requirements: TorqueSalesInventorySpec;
  vehicles: Vehicle[];
  observedAt?: string;
  sourceLabel?: string;
}): VehicleHuntCandidate[] {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const sourceLabel = input.sourceLabel ?? "Orr Nissan West";
  if (Number.isNaN(Date.parse(observedAt))) throw new Error("Hunt inventory match requires a valid observation time.");

  return rankVehiclesForSalesSpec({
    requirements: input.requirements,
    vehicles: input.vehicles.filter((vehicle) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(vehicle.id)),
    limit: 12,
  }).map((entry) => ({
    vin: entry.vehicle.id.toUpperCase(),
    sourceScope: "LOCAL_STORE",
    sourceLabel,
    observedAt,
    fit: entry.fit,
    verified: true,
    reasons: entry.reasons,
    compromises: entry.compromises,
  }));
}

function classifyFit(evaluation: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">): VehicleHuntCandidate["fit"] {
  if (evaluation.hardMisses === 0 && evaluation.softMisses === 0) return "EXACT";
  if (evaluation.hardMisses === 0 && evaluation.softMisses <= 2) return "STRONG";
  return "NEAR";
}

function evaluateVehicle(
  spec: TorqueSalesInventorySpec,
  vehicle: Vehicle,
): Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit"> {
  const result = { reasons: [], compromises: [], hardMisses: 0, softMisses: 0 };

  compareText(result, spec.make, vehicle.make, "make");
  compareText(result, spec.model, vehicle.model, "model");
  compareYear(result, spec.modelYear, vehicle.year);
  compareText(result, spec.trim, vehicle.trim, "trim", true);
  compareText(result, spec.condition, vehicle.condition ?? "", "condition");
  compareMax(result, spec.maxPrice, vehicle.price, "price");
  compareMax(result, spec.maxMileage, vehicle.mileage, "mileage");
  compareText(result, spec.exteriorColor, vehicle.exteriorColor ?? vehicle.accent ?? "", "exterior color", true);
  compareText(result, spec.interiorColor, vehicle.interiorColor ?? "", "interior color", true);
  compareText(result, spec.drivetrain, vehicle.drivetrain, "drivetrain", true);
  compareText(result, spec.engine, vehicle.engine ?? "", "engine", true);
  compareText(result, spec.transmission, vehicle.transmission ?? "", "transmission", true);
  compareText(result, spec.fuelType, vehicle.fuelType ?? "", "fuel type", true);

  const searchable = [
    vehicle.trim,
    vehicle.type,
    vehicle.drivetrain,
    vehicle.exteriorColor,
    vehicle.interiorColor,
    vehicle.engine,
    vehicle.transmission,
    ...(vehicle.features ?? []),
  ].filter((value): value is string => Boolean(value)).join(" ").toLowerCase();

  compareSearchable(result, spec.interiorMaterial, searchable, "interior material");
  compareSearchable(result, spec.cabStyle, searchable, "cab style", true);
  compareSearchable(result, spec.bedLength, searchable, "bed length", true);
  compareSearchable(result, spec.seatingLayout, searchable, "seating layout", true);

  for (const requirement of spec.packages) compareSearchable(result, requirement, searchable, "package", true);
  for (const requirement of spec.features) compareSearchable(result, requirement, searchable, "feature", true);
  for (const exclusion of spec.exclusions) compareExclusion(result, exclusion.priority, exclusion.value, searchable);

  return result;
}

function priorityMiss(result: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">, priority: TorqueRequirementPriority, label: string) {
  result.compromises.push(label);
  if (priority === "MUST_HAVE") result.hardMisses += 1;
  else result.softMisses += 1;
}

function compareText(
  result: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">,
  requirement: { value: unknown; priority: TorqueRequirementPriority } | undefined,
  actual: string,
  label: string,
  fuzzy = false,
) {
  if (!requirement) return;
  const expected = normalize(String(requirement.value));
  const actualNormalized = normalize(actual);
  const matches = fuzzy
    ? actualNormalized.includes(expected) || expected.includes(actualNormalized)
    : actualNormalized === expected;
  if (matches) result.reasons.push(label + ": " + String(requirement.value));
  else priorityMiss(result, requirement.priority, label + " mismatch");
}

function compareYear(
  result: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">,
  requirement: { value: number | { min?: number; max?: number }; priority: TorqueRequirementPriority } | undefined,
  actual: number,
) {
  if (!requirement) return;
  const value = requirement.value;
  const matches = typeof value === "number"
    ? actual === value
    : (value.min === undefined || actual >= value.min) && (value.max === undefined || actual <= value.max);
  if (matches) result.reasons.push("model year: " + actual);
  else priorityMiss(result, requirement.priority, "model year mismatch");
}

function compareMax(
  result: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">,
  requirement: { value: number; priority: TorqueRequirementPriority } | undefined,
  actual: number,
  label: string,
) {
  if (!requirement) return;
  if (actual <= requirement.value) result.reasons.push(label + " within limit");
  else priorityMiss(result, requirement.priority, label + " exceeds limit");
}

function compareSearchable(
  result: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">,
  requirement: { value: unknown; priority: TorqueRequirementPriority } | undefined,
  searchable: string,
  label: string,
  fuzzy = false,
) {
  if (!requirement) return;
  const raw = String(requirement.value);
  const needles = aliases(raw);
  const matches = needles.some((needle) => {
    const normalizedNeedle = normalize(needle);
    const normalizedHaystack = normalize(searchable);
    return fuzzy
      ? normalizedHaystack.includes(normalizedNeedle) || normalizedNeedle.includes(normalizedHaystack)
      : normalizedHaystack.includes(normalizedNeedle);
  });
  if (matches) result.reasons.push(label + ": " + raw);
  else priorityMiss(result, requirement.priority, "no source evidence for " + label + ": " + raw);
}

function compareExclusion(
  result: Omit<SalesSpecVehicleEvaluation, "vehicle" | "fit">,
  priority: TorqueRequirementPriority,
  value: unknown,
  searchable: string,
) {
  const raw = String(value);
  if (aliases(raw).some((needle) => normalize(searchable).includes(normalize(needle)))) {
    priorityMiss(result, priority, "excluded item present: " + raw);
  } else {
    result.reasons.push("exclusion clear: " + raw);
  }
}

function aliases(value: string) {
  const normalized = normalize(value);
  const map: Record<string, string[]> = {
    kingcab: ["king cab"],
    crewcab: ["crew cab"],
    long: ["6 foot", "6-foot", "long bed", "extended bed"],
    short: ["5 foot", "5-foot", "short bed"],
    chestnut: ["chestnut", "brown"],
    baltictealpearl: ["baltic teal pearl", "baltic teal", "baltic green"],
    "4wd": ["4wd", "4x4"],
    "4x4": ["4x4", "4wd"],
  };
  return map[normalized] ?? [value];
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}


function identityRequirementsMatch(spec: TorqueSalesInventorySpec, vehicle: Vehicle) {
  if (spec.make?.priority === "MUST_HAVE" && normalize(String(spec.make.value)) !== normalize(vehicle.make)) return false;
  if (spec.model?.priority === "MUST_HAVE" && normalize(String(spec.model.value)) !== normalize(vehicle.model)) return false;
  return true;
}
