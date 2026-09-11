import {
  evaluatePurchaseEstimateRequest,
  PURCHASE_ESTIMATE_ACTIVATION_VALUE,
  PURCHASE_ESTIMATE_MAX_BODY_BYTES,
} from "../src/lib/purchase-estimate-endpoint-policy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const txRule = "https://comptroller.texas.gov/taxes/motor-vehicle/sales-use.php";
const txDmv = "https://www.txdmv.gov/motorists/buying-or-selling-a-vehicle";
const nowMs = Date.parse("2026-09-11T10:30:00.000Z");

const validPackage = {
  packageId: "estimate_tx_001",
  jurisdiction: "TX",
  ruleSources: [txRule, txDmv],
  evidence: [
    {
      evidenceId: "deal_basis_001",
      jurisdiction: "TX",
      evidenceClass: "DEAL_RECORD",
      observedAt: "2026-09-11T10:00:00.000Z",
    },
    {
      evidenceId: "gov_title_001",
      jurisdiction: "TX",
      evidenceClass: "OFFICIAL_GOVERNMENT_SOURCE",
      sourceUrl: txDmv,
      observedAt: "2026-09-11T10:01:00.000Z",
    },
    {
      evidenceId: "gov_complete_001",
      jurisdiction: "TX",
      evidenceClass: "OFFICIAL_GOVERNMENT_SOURCE",
      sourceUrl: txRule,
      observedAt: "2026-09-11T10:02:00.000Z",
    },
  ],
  calculationInput: {
    jurisdiction: "TX",
    startingVehiclePrice: 30000,
    docFee: 225,
    ordinaryDealerSale: true,
    taxBasisAmount: 28000,
    taxBasisProvenance: "deal_basis_001",
    verifiedAdditionalGovernmentCharges: [
      {
        amount: 75,
        provenance: "gov_title_001",
        verifiedAt: "2026-09-11T10:01:00.000Z",
        collectionTiming: "DEALER",
      },
    ],
    governmentChargesComplete: true,
    governmentChargesCompletenessProvenance: "gov_complete_001",
  },
};

function body(value: unknown) {
  return JSON.stringify(value);
}

function run() {
  const dark = evaluatePurchaseEstimateRequest({
    activationValue: undefined,
    rawBody: body(validPackage),
    nowMs,
  });
  assert(dark.status === "NOT_ACTIVATED" && dark.httpStatus === 503, "Endpoint policy must default dark.");

  const wrongActivation = evaluatePurchaseEstimateRequest({
    activationValue: "true",
    rawBody: body(validPackage),
    nowMs,
  });
  assert(wrongActivation.status === "NOT_ACTIVATED", "Only the exact activation value may enable calculation.");

  const oversized = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: "é".repeat(PURCHASE_ESTIMATE_MAX_BODY_BYTES),
    nowMs,
  });
  assert(oversized.status === "BODY_TOO_LARGE" && oversized.httpStatus === 413, "Actual UTF-8 bytes must control size enforcement.");

  const invalidJson = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: "{not-json",
    nowMs,
  });
  assert(invalidJson.status === "INVALID_JSON", "Malformed JSON must fail closed.");

  const extraField = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: body({ ...validPackage, surprise: "not allowed" }),
    nowMs,
  });
  assert(extraField.status === "INVALID_REQUEST", "Strict request schema must reject unknown top-level fields.");

  const unsupported = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: body({
      packageId: "estimate_ca_001",
      jurisdiction: "CA",
      ruleSources: [],
      evidence: [],
      calculationInput: { jurisdiction: "CA", startingVehiclePrice: 30000 },
    }),
    nowMs,
  });
  assert(unsupported.status === "EVIDENCE_REJECTED", "Unsupported jurisdiction must be rejected.");
  assert(unsupported.reasons.includes("JURISDICTION_NOT_VERIFIED"), "Unsupported jurisdiction reason must be explicit.");

  const stale = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: body(validPackage),
    nowMs: Date.parse("2026-10-11T10:30:00.000Z"),
  });
  assert(stale.status === "EVIDENCE_REJECTED", "Stale state rules must not calculate.");
  assert(stale.ruleReviewState === "STALE_REVIEW_REQUIRED", "Stale state must remain explicit.");

  const futureEvidencePackage = JSON.parse(body(validPackage));
  futureEvidencePackage.evidence[0].observedAt = "2026-09-12T10:00:00.000Z";
  const futureEvidence = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: body(futureEvidencePackage),
    nowMs,
  });
  assert(futureEvidence.status === "EVIDENCE_REJECTED", "Future evidence must fail closed.");
  assert(futureEvidence.reasons.includes("EVIDENCE_FROM_FUTURE"), "Future evidence reason must be explicit.");

  const valid = evaluatePurchaseEstimateRequest({
    activationValue: PURCHASE_ESTIMATE_ACTIVATION_VALUE,
    rawBody: body(validPackage),
    nowMs,
  });
  assert(valid.status === "BOUNDED_ESTIMATE", "Valid current bounded package should produce estimate.");
  assert(valid.httpStatus === 200, "Bounded estimate should map to HTTP 200.");
  assert(valid.authorityEffect === "NONE", "Estimate endpoint must create no authority.");
  assert(valid.ruleReviewState === "CURRENT", "Bounded estimate requires current rule state.");
  assert(valid.evidenceDigestSha256.length === 64, "Response must preserve SHA-256 evidence receipt.");
  assert(valid.calculation.truthState === "PARTIALLY_VERIFIED", "Endpoint must not over-promote structural evidence into independent verification.");
  assert(valid.calculation.motorVehicleSalesTax === 1750, "Texas tax arithmetic must use supplied verified basis only.");
  assert(valid.calculation.estimatedPurchaseTotal === 32050, "Bounded total should match supported synthetic inputs.");
  assert(valid.calculation.labels.total === "ESTIMATED_PURCHASE_TOTAL", "Total label must remain estimate-only.");
  assert(valid.finalOutTheDoorClaimed === false, "Endpoint must never claim final OTD in bounded state.");
  assert(valid.legalAdviceClaimed === false, "Endpoint must not claim legal advice.");
  assert(valid.regulatoryApprovalClaimed === false, "Endpoint must not claim regulatory approval.");
  assert(valid.externalSideEffectObserved === false, "Policy evaluation must remain side-effect-free.");

  console.log("PASS purchase estimate endpoint policy invariants");
}

run();
