import { z } from "zod";
import {
  verifyStateCostEvidencePackage,
  type StateCostEvidencePackage,
  type StateCostEvidenceGateResult,
} from "./state-purchase-cost-evidence-gate";

export const PURCHASE_ESTIMATE_ACTIVATION_VALUE = "ENABLE_BOUNDED_PURCHASE_ESTIMATES";
export const PURCHASE_ESTIMATE_MAX_BODY_BYTES = 32 * 1024;

const shortString = z.string().trim().min(1).max(512);
const jurisdiction = z.string().trim().min(2).max(3);
const nonNegativeMoney = z.number().finite().min(0).max(100_000_000);

const governmentChargeSchema = z.object({
  amount: nonNegativeMoney,
  provenance: shortString,
  verifiedAt: z.string().trim().min(1).max(64),
  collectionTiming: z.enum(["DEALER", "LATER"]),
}).strict();

const evidenceItemSchema = z.object({
  evidenceId: z.string().trim().min(1).max(256),
  jurisdiction,
  evidenceClass: z.enum(["OFFICIAL_GOVERNMENT_SOURCE", "DEAL_RECORD", "DEALER_SOURCE"]),
  sourceUrl: z.string().trim().url().max(2048).optional(),
  observedAt: z.string().trim().min(1).max(64),
  note: z.string().trim().max(1000).optional(),
}).strict();

const calculationInputSchema = z.object({
  jurisdiction,
  startingVehiclePrice: nonNegativeMoney,
  docFee: nonNegativeMoney.optional(),
  serviceHandlingFee: nonNegativeMoney.optional(),
  otherDealerFees: nonNegativeMoney.optional(),
  taxBasisAmount: nonNegativeMoney.optional(),
  taxBasisProvenance: shortString.optional(),
  verifiedAdditionalGovernmentCharges: z.array(governmentChargeSchema).max(32).optional(),
  governmentChargesComplete: z.boolean().optional(),
  governmentChargesCompletenessProvenance: shortString.optional(),
  ordinaryDealerSale: z.boolean().optional(),
}).strict();

export const purchaseEstimateRequestSchema = z.object({
  packageId: z.string().trim().min(1).max(256),
  jurisdiction,
  ruleSources: z.array(z.string().trim().url().max(2048)).max(16),
  evidence: z.array(evidenceItemSchema).max(64),
  calculationInput: calculationInputSchema,
}).strict();

export type PurchaseEstimatePolicyResult =
  | { status: "NOT_ACTIVATED"; httpStatus: 503; authorityEffect: "NONE" }
  | { status: "BODY_TOO_LARGE"; httpStatus: 413; authorityEffect: "NONE" }
  | { status: "INVALID_JSON"; httpStatus: 400; authorityEffect: "NONE" }
  | { status: "INVALID_REQUEST"; httpStatus: 400; authorityEffect: "NONE"; issues: string[] }
  | {
      status: "EVIDENCE_REJECTED";
      httpStatus: 422;
      authorityEffect: "NONE";
      evidenceDigestSha256: string;
      ruleReviewState: StateCostEvidenceGateResult["ruleReviewState"];
      reasons: string[];
    }
  | {
      status: "BOUNDED_ESTIMATE";
      httpStatus: 200;
      authorityEffect: "NONE";
      evidenceDigestSha256: string;
      ruleReviewState: "CURRENT";
      calculation: NonNullable<StateCostEvidenceGateResult["calculation"]>;
      finalOutTheDoorClaimed: false;
      legalAdviceClaimed: false;
      regulatoryApprovalClaimed: false;
      externalSideEffectObserved: false;
    };

function issuePaths(error: z.ZodError) {
  return error.issues.slice(0, 20).map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "request";
    return `${path}: ${issue.message}`;
  });
}

export function evaluatePurchaseEstimateRequest(input: {
  activationValue: string | undefined;
  rawBody: string;
  nowMs?: number;
}): PurchaseEstimatePolicyResult {
  if (input.activationValue?.trim() !== PURCHASE_ESTIMATE_ACTIVATION_VALUE) {
    return { status: "NOT_ACTIVATED", httpStatus: 503, authorityEffect: "NONE" };
  }

  if (Buffer.byteLength(input.rawBody, "utf8") > PURCHASE_ESTIMATE_MAX_BODY_BYTES) {
    return { status: "BODY_TOO_LARGE", httpStatus: 413, authorityEffect: "NONE" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(input.rawBody);
  } catch {
    return { status: "INVALID_JSON", httpStatus: 400, authorityEffect: "NONE" };
  }

  const parsed = purchaseEstimateRequestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      status: "INVALID_REQUEST",
      httpStatus: 400,
      authorityEffect: "NONE",
      issues: issuePaths(parsed.error),
    };
  }

  const gate = verifyStateCostEvidencePackage(
    parsed.data as StateCostEvidencePackage,
    input.nowMs,
  );

  if (!gate.valid || !gate.calculation || gate.ruleReviewState !== "CURRENT") {
    return {
      status: "EVIDENCE_REJECTED",
      httpStatus: 422,
      authorityEffect: "NONE",
      evidenceDigestSha256: gate.evidenceDigestSha256,
      ruleReviewState: gate.ruleReviewState,
      reasons: gate.reasons.length ? gate.reasons : ["EVIDENCE_GATE_DID_NOT_PRODUCE_CURRENT_CALCULATION"],
    };
  }

  return {
    status: "BOUNDED_ESTIMATE",
    httpStatus: 200,
    authorityEffect: "NONE",
    evidenceDigestSha256: gate.evidenceDigestSha256,
    ruleReviewState: "CURRENT",
    calculation: gate.calculation,
    finalOutTheDoorClaimed: false,
    legalAdviceClaimed: false,
    regulatoryApprovalClaimed: false,
    externalSideEffectObserved: false,
  };
}
