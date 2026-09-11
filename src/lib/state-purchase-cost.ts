export type StatePurchaseCostTruthState =
  | "VERIFIED_CURRENT"
  | "PARTIALLY_VERIFIED"
  | "UNVERIFIED_DO_NOT_CALCULATE"
  | "STALE_REVIEW_REQUIRED";

export type VerifiedGovernmentCharge = {
  amount: number;
  provenance: string;
  verifiedAt: string;
  collectionTiming: "DEALER" | "LATER";
};

export type StatePurchaseCostInput = {
  jurisdiction: string;
  startingVehiclePrice: number;
  docFee?: number;
  serviceHandlingFee?: number;
  otherDealerFees?: number;
  taxBasisAmount?: number;
  taxBasisProvenance?: string;
  verifiedAdditionalGovernmentCharges?: VerifiedGovernmentCharge[];
  governmentChargesComplete?: boolean;
  ordinaryDealerSale?: boolean;
};

export type StatePurchaseCostResult = {
  jurisdiction: string;
  truthState: StatePurchaseCostTruthState;
  sourceContract: "IGNIAQUA_STATE_VEHICLE_PURCHASE_COST_TRUTH_V0_1";
  sourceContractBlobSha: "733c87de9f294942f41c84e2ea482990f905d7c1";
  legalBoundary: {
    matterClass: "L1_BOUNDED_COMPLIANCE_SUPPORT";
    authorityEffect: "NONE";
    externalActionAuthority: "DENY_BY_DEFAULT";
    legalAdviceClaimed: false;
    regulatoryApprovalClaimed: false;
  };
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

function partitionGovernmentCharges(charges: VerifiedGovernmentCharge[] = []) {
  for (const charge of charges) {
    if (!Number.isFinite(charge.amount) || charge.amount < 0) {
      throw new Error("verified government charges must be finite non-negative amounts");
    }
    if (!charge.provenance.trim() || !charge.verifiedAt.trim()) {
      throw new Error("verified government charges require provenance and verifiedAt");
    }
  }

  return {
    dealer: money(
      charges
        .filter((charge) => charge.collectionTiming === "DEALER")
        .reduce((sum, charge) => sum + charge.amount, 0),
    ),
    later: money(
      charges
        .filter((charge) => charge.collectionTiming === "LATER")
        .reduce((sum, charge) => sum + charge.amount, 0),
    ),
  };
}

function baseResult(input: StatePurchaseCostInput): StatePurchaseCostResult {
  return {
    jurisdiction: input.jurisdiction.trim().toUpperCase(),
    truthState: "UNVERIFIED_DO_NOT_CALCULATE",
    sourceContract: SOURCE_CONTRACT,
    sourceContractBlobSha: SOURCE_BLOB_SHA,
    legalBoundary: {
      matterClass: "L1_BOUNDED_COMPLIANCE_SUPPORT",
      authorityEffect: "NONE",
      externalActionAuthority: "DENY_BY_DEFAULT",
      legalAdviceClaimed: false,
      regulatoryApprovalClaimed: false,
    },
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
  const government = partitionGovernmentCharges(input.verifiedAdditionalGovernmentCharges);
  const hasGovernmentChargeEvidence = Boolean(input.verifiedAdditionalGovernmentCharges?.length);
  const governmentChargesComplete = input.governmentChargesComplete === true;

  if (governmentChargesComplete && !hasGovernmentChargeEvidence) {
    throw new Error("governmentChargesComplete cannot be true without verified government charge evidence");
  }

  if (jurisdiction === "OK") {
    result.ruleLastVerified = "2026-09-10";
    result.truthState = "PARTIALLY_VERIFIED";
    result.dueAtDealer = money(dealerSubtotal(input) + government.dealer);
    if (government.later > 0) result.dueLaterToStateOrLocalAuthority = government.later;

    result.limitations.push(
      "Oklahoma workflow is verified, but the current canonical contract does not contain a tax-rate/basis implementation sufficient to independently calculate taxes, title, registration, or a complete purchase total.",
      "Dealer generally does not collect all title/tax/license amounts at sale under the verified workflow; deal-specific government charges must come from official current evidence with collection timing.",
    );

    if (governmentChargesComplete) {
      result.estimatedPurchaseTotal = money(result.dueAtDealer + government.later);
      result.labels.total = "ESTIMATED_PURCHASE_TOTAL";
    } else if (hasGovernmentChargeEvidence) {
      result.limitations.push(
        "Some verified government charges are present, but completeness has not been established; no total is emitted.",
      );
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

    result.dueAtDealer = money(result.dueAtDealer + government.dealer);
    if (government.later > 0) result.dueLaterToStateOrLocalAuthority = government.later;

    if (!governmentChargesComplete) {
      result.limitations.push(
        "Title, registration, plate, local, and other deal-specific government charges are not treated as complete unless completeness is explicitly supported.",
      );
    }

    if (taxBasisSupported && governmentChargesComplete) {
      result.estimatedPurchaseTotal = money(result.dueAtDealer + government.later);
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
