export type StatePurchaseCostTruthState =
  | "VERIFIED_CURRENT"
  | "PARTIALLY_VERIFIED"
  | "UNVERIFIED_DO_NOT_CALCULATE"
  | "STALE_REVIEW_REQUIRED";

export type VerifiedAmount = {
  amount: number;
  provenance: string;
  verifiedAt: string;
};

export type StatePurchaseCostInput = {
  jurisdiction: string;
  startingVehiclePrice: number;
  docFee?: number;
  serviceHandlingFee?: number;
  otherDealerFees?: number;
  taxBasisAmount?: number;
  taxBasisProvenance?: string;
  verifiedAdditionalGovernmentCharges?: VerifiedAmount[];
  ordinaryDealerSale?: boolean;
};

export type StatePurchaseCostResult = {
  jurisdiction: string;
  truthState: StatePurchaseCostTruthState;
  sourceContract: "IGNIAQUA_STATE_VEHICLE_PURCHASE_COST_TRUTH_V0_1";
  sourceContractBlobSha: "733c87de9f294942f41c84e2ea482990f905d7c1";
  ruleLastVerified?: string;
  startingVehiclePrice: number;
  dueAtDealer?: number;
  dueLaterToStateOrLocalAuthority?: number;
  estimatedPurchaseTotal?: number;
  motorVehicleSalesTax?: number;
  labels: {
    startingVehiclePrice: "STARTING_VEHICLE_PRICE";
    total?: "ESTIMATED_PURCHASE_TOTAL";
  };
  limitations: string[];
};

const SOURCE_CONTRACT = "IGNIAQUA_STATE_VEHICLE_PURCHASE_COST_TRUTH_V0_1" as const;
const SOURCE_BLOB_SHA = "733c87de9f294942f41c84e2ea482990f905d7c1" as const;

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finiteNonNegative(value: number | undefined) {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

function dealerSubtotal(input: StatePurchaseCostInput) {
  return money(
    input.startingVehiclePrice +
      (input.docFee ?? 0) +
      (input.serviceHandlingFee ?? 0) +
      (input.otherDealerFees ?? 0),
  );
}

function baseResult(input: StatePurchaseCostInput): StatePurchaseCostResult {
  return {
    jurisdiction: input.jurisdiction.trim().toUpperCase(),
    truthState: "UNVERIFIED_DO_NOT_CALCULATE",
    sourceContract: SOURCE_CONTRACT,
    sourceContractBlobSha: SOURCE_BLOB_SHA,
    startingVehiclePrice: money(input.startingVehiclePrice),
    labels: { startingVehiclePrice: "STARTING_VEHICLE_PRICE" },
    limitations: [],
  };
}

export function evaluateStatePurchaseCost(input: StatePurchaseCostInput): StatePurchaseCostResult {
  if (!Number.isFinite(input.startingVehiclePrice) || input.startingVehiclePrice < 0) {
    throw new Error("startingVehiclePrice must be a finite non-negative number");
  }
  if (![input.docFee, input.serviceHandlingFee, input.otherDealerFees].every(finiteNonNegative)) {
    throw new Error("dealer fees must be finite non-negative numbers when supplied");
  }

  const result = baseResult(input);
  const jurisdiction = result.jurisdiction;

  if (jurisdiction === "OK") {
    result.ruleLastVerified = "2026-09-10";
    result.truthState = "PARTIALLY_VERIFIED";
    result.dueAtDealer = dealerSubtotal(input);
    result.limitations.push(
      "Oklahoma workflow is verified, but the current canonical contract does not contain a tax-rate/basis implementation sufficient to calculate taxes, title, registration, or a complete purchase total.",
      "Dealer generally does not collect all title/tax/license amounts at sale under the verified workflow; deal-specific government charges must come from official current evidence.",
    );

    if (input.verifiedAdditionalGovernmentCharges?.length) {
      const verifiedGovernment = money(
        input.verifiedAdditionalGovernmentCharges.reduce((sum, charge) => sum + charge.amount, 0),
      );
      result.dueLaterToStateOrLocalAuthority = verifiedGovernment;
      result.estimatedPurchaseTotal = money(result.dueAtDealer + verifiedGovernment);
      result.labels.total = "ESTIMATED_PURCHASE_TOTAL";
    }
    return result;
  }

  if (jurisdiction === "TX") {
    result.ruleLastVerified = "2026-09-10";
    result.truthState = "PARTIALLY_VERIFIED";
    result.dueAtDealer = dealerSubtotal(input);

    const taxBasisSupported =
      input.ordinaryDealerSale === true &&
      Number.isFinite(input.taxBasisAmount) &&
      (input.taxBasisAmount ?? -1) >= 0 &&
      Boolean(input.taxBasisProvenance?.trim());

    if (taxBasisSupported) {
      result.motorVehicleSalesTax = money((input.taxBasisAmount as number) * 0.0625);
      result.dueAtDealer = money(result.dueAtDealer + result.motorVehicleSalesTax);
    } else {
      result.limitations.push(
        "Texas motor-vehicle sales tax is not calculated until an ordinary dealer sale and a verified tax basis with provenance are supplied; the runtime does not derive trade-in or rebate tax treatment.",
      );
    }

    if (input.verifiedAdditionalGovernmentCharges?.length) {
      const verifiedGovernment = money(
        input.verifiedAdditionalGovernmentCharges.reduce((sum, charge) => sum + charge.amount, 0),
      );
      result.dueAtDealer = money(result.dueAtDealer + verifiedGovernment);
    } else {
      result.limitations.push(
        "Title, registration, plate, local, and other deal-specific government charges are not assumed from the state tax rate.",
      );
    }

    const hasCompleteKnownTax = taxBasisSupported;
    const hasAdditionalGovernmentCharges = Boolean(input.verifiedAdditionalGovernmentCharges?.length);
    if (hasCompleteKnownTax && hasAdditionalGovernmentCharges) {
      result.estimatedPurchaseTotal = result.dueAtDealer;
      result.labels.total = "ESTIMATED_PURCHASE_TOTAL";
      result.truthState = "VERIFIED_CURRENT";
    }
    return result;
  }

  result.limitations.push(
    "Jurisdiction is not verified in the canonical IgniAqua state vehicle purchase-cost contract. No state/local purchase-cost calculation is permitted.",
  );
  return result;
}
