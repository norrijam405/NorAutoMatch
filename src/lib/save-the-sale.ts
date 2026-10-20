import type { Vehicle } from "./inventory";
import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";
import { rankVehiclesForSalesSpec } from "./vehicle-hunt-inventory-matcher";

export type SaveTheSaleRecommendation = {
  vehicle: Vehicle;
  fit: "EXACT" | "STRONG";
  verifiedReasons: string[];
  preferenceCompromises: string[];
};

export type SaveTheSaleResult = {
  protocol: "NORAUTO_SAVE_THE_SALE_R0";
  eligibleVehicleCount: number;
  exactCount: number;
  strongCount: number;
  localOptions: SaveTheSaleRecommendation[];
  opportunity: "PRESENT_LOCAL_MATCH" | "VERIFY_AND_SOURCE";
  nextStep: string;
  commissionEffect: "LOCAL_FIRST_WITHIN_CUSTOMER_FIT_ONLY";
  externalAvailabilityClaim: false;
};

/**
 * Restrict sales opportunities to already verified, eligible Orr West stock.
 * A MUST_HAVE miss is never rescued as a safe recommendation, regardless of commission.
 */
export function buildSaveTheSaleResult(input: {
  requirements: TorqueSalesInventorySpec;
  vehicles: Vehicle[];
  maxResults?: number;
}): SaveTheSaleResult {
  // No truncation before ranking. The caller's catalog must already have passed
  // full-source verification and dealership eligibility checks.
  const evaluated = rankVehiclesForSalesSpec({
    requirements: input.requirements,
    vehicles: input.vehicles,
    limit: Math.max(1, Math.min(input.vehicles.length, 2_000)),
  });
  const acceptable = evaluated.filter((candidate) => candidate.hardMisses === 0);
  const exact = acceptable.filter((candidate) => candidate.fit === "EXACT");
  const strong = acceptable.filter((candidate) => candidate.fit === "STRONG");
  const maxResults = Math.max(1, Math.min(input.maxResults ?? 8, 20));
  const localOptions = [...exact, ...strong].slice(0, maxResults).map((candidate) => ({
    vehicle: candidate.vehicle,
    fit: candidate.fit as "EXACT" | "STRONG",
    verifiedReasons: candidate.reasons,
    preferenceCompromises: candidate.compromises,
  }));
  const opportunity = localOptions.length > 0 ? "PRESENT_LOCAL_MATCH" : "VERIFY_AND_SOURCE";
  return {
    protocol: "NORAUTO_SAVE_THE_SALE_R0",
    eligibleVehicleCount: input.vehicles.length,
    exactCount: exact.length,
    strongCount: strong.length,
    localOptions,
    opportunity,
    nextStep: opportunity === "PRESENT_LOCAL_MATCH"
      ? "Verify current availability, confirm pricing and any tradeoffs with the customer, then present the best local fit."
      : "Do not relax non-negotiable needs without customer approval. Start a Vehicle Hunt and verify authorized sourcing options.",
    commissionEffect: "LOCAL_FIRST_WITHIN_CUSTOMER_FIT_ONLY",
    externalAvailabilityClaim: false,
  };
}
