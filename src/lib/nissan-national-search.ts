import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";

export type NissanNationalSearchPlan = {
  protocol: "NORAUTO_NISSAN_NATIONAL_SEARCH_PLAN_V1";
  url: string;
  appliedFilters: string[];
  residualRequirements: string[];
  authority: "OFFICIAL_NISSAN_DISCOVERY_ONLY";
  availabilityClaim: "NOT_PROVEN";
  transferClaim: "NOT_PROVEN";
};

export function buildNissanNationalSearchPlan(
  requirements: TorqueSalesInventorySpec,
): NissanNationalSearchPlan {
  const url = new URL("https://www.nissanusa.com/shopping-tools/search-inventory");
  const appliedFilters: string[] = [];
  const residualRequirements: string[] = [];

  const make = scalar(requirements.make?.value);
  if (make && normalize(make) !== "nissan") {
    residualRequirements.push("requested make is not Nissan");
  }

  const model = scalar(requirements.model?.value);
  if (model) {
    url.searchParams.set("models", slug(model));
    appliedFilters.push("model: " + model);
  }

  const year = requirements.modelYear?.value;
  if (typeof year === "number") {
    url.searchParams.set("modelYear", String(year));
    appliedFilters.push("model year: " + year);
  } else if (year) {
    residualRequirements.push("model year range requires manual verification");
  }

  const trim = scalar(requirements.trim?.value);
  if (trim) {
    url.searchParams.set("trim", slug(trim));
    appliedFilters.push("trim: " + trim);
  }

  addResidual(requirements.exteriorColor?.value, "exterior color", residualRequirements);
  addResidual(requirements.interiorColor?.value, "interior color", residualRequirements);
  addResidual(requirements.interiorMaterial?.value, "interior material", residualRequirements);
  addResidual(requirements.drivetrain?.value, "drivetrain", residualRequirements);
  addResidual(requirements.cabStyle?.value, "cab style", residualRequirements);
  addResidual(requirements.bedLength?.value, "bed length", residualRequirements);
  addResidual(requirements.maxPrice?.value, "price ceiling", residualRequirements);

  for (const item of requirements.features) {
    residualRequirements.push("feature: " + String(item.value));
  }
  for (const item of requirements.packages) {
    residualRequirements.push("package: " + String(item.value));
  }

  return {
    protocol: "NORAUTO_NISSAN_NATIONAL_SEARCH_PLAN_V1",
    url: url.toString(),
    appliedFilters,
    residualRequirements,
    authority: "OFFICIAL_NISSAN_DISCOVERY_ONLY",
    availabilityClaim: "NOT_PROVEN",
    transferClaim: "NOT_PROVEN",
  };
}

function scalar(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function addResidual(value: unknown, label: string, target: string[]) {
  if (value === undefined || value === null || value === "") return;
  target.push(label + ": " + String(value));
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
