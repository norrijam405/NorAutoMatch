import { verifyStateCostEvidencePackage } from "../src/lib/state-purchase-cost-evidence-gate";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const txRule = "https://comptroller.texas.gov/taxes/motor-vehicle/sales-use.php";
const txDmv = "https://www.txdmv.gov/motorists/buying-or-selling-a-vehicle";

function run() {
  const valid = verifyStateCostEvidencePackage({
    packageId: "sce_tx_001",
    jurisdiction: "TX",
    ruleSources: [txRule, txDmv],
    evidence: [
      {
        evidenceId: "deal_tax_basis_001",
        jurisdiction: "TX",
        evidenceClass: "DEAL_RECORD",
        observedAt: "2026-09-11T08:00:00.000Z",
        note: "Synthetic deal-specific tax-basis record",
      },
      {
        evidenceId: "gov_title_001",
        jurisdiction: "TX",
        evidenceClass: "OFFICIAL_GOVERNMENT_SOURCE",
        sourceUrl: txDmv,
        observedAt: "2026-09-11T08:01:00.000Z",
      },
      {
        evidenceId: "gov_completeness_001",
        jurisdiction: "TX",
        evidenceClass: "OFFICIAL_GOVERNMENT_SOURCE",
        sourceUrl: txRule,
        observedAt: "2026-09-11T08:02:00.000Z",
      },
    ],
    calculationInput: {
      jurisdiction: "TX",
      startingVehiclePrice: 30000,
      docFee: 225,
      ordinaryDealerSale: true,
      taxBasisAmount: 28000,
      taxBasisProvenance: "deal_tax_basis_001",
      verifiedAdditionalGovernmentCharges: [
        {
          amount: 75,
          provenance: "gov_title_001",
          verifiedAt: "2026-09-11T08:01:00.000Z",
          collectionTiming: "DEALER",
        },
      ],
      governmentChargesComplete: true,
      governmentChargesCompletenessProvenance: "gov_completeness_001",
    },
  });

  assert(valid.valid, `Expected valid structural evidence package: ${valid.reasons.join(",")}`);
  assert(valid.authorityEffect === "NONE", "Evidence gate must not create authority.");
  assert(valid.evidenceDigestSha256.length === 64, "Evidence receipt digest must be SHA-256.");
  assert(valid.calculation?.truthState === "PARTIALLY_VERIFIED", "Structural evidence validation must not become independent legal verification.");
  assert(valid.calculation?.estimatedPurchaseTotal === 32050, "Validated package should permit bounded estimate arithmetic.");

  const forgedRule = verifyStateCostEvidencePackage({
    packageId: "sce_tx_bad_rule",
    jurisdiction: "TX",
    ruleSources: ["https://example.com/texas-tax"],
    evidence: [],
    calculationInput: { jurisdiction: "TX", startingVehiclePrice: 30000 },
  });
  assert(!forgedRule.valid && forgedRule.reasons.includes("UNRECOGNIZED_RULE_SOURCE"), "Unrecognized rule source must fail closed.");
  assert(forgedRule.calculation === undefined, "Invalid evidence package must not calculate.");

  const unresolvedTaxBasis = verifyStateCostEvidencePackage({
    packageId: "sce_tx_missing_basis",
    jurisdiction: "TX",
    ruleSources: [txRule],
    evidence: [],
    calculationInput: {
      jurisdiction: "TX",
      startingVehiclePrice: 30000,
      ordinaryDealerSale: true,
      taxBasisAmount: 28000,
      taxBasisProvenance: "missing_deal_record",
    },
  });
  assert(!unresolvedTaxBasis.valid && unresolvedTaxBasis.reasons.includes("TAX_BASIS_PROVENANCE_UNRESOLVED"), "Unresolved tax-basis provenance must fail closed.");

  const wrongGovernmentClass = verifyStateCostEvidencePackage({
    packageId: "sce_tx_wrong_class",
    jurisdiction: "TX",
    ruleSources: [txRule],
    evidence: [
      {
        evidenceId: "fee_001",
        jurisdiction: "TX",
        evidenceClass: "DEALER_SOURCE",
        observedAt: "2026-09-11T08:03:00.000Z",
      },
    ],
    calculationInput: {
      jurisdiction: "TX",
      startingVehiclePrice: 30000,
      verifiedAdditionalGovernmentCharges: [
        {
          amount: 75,
          provenance: "fee_001",
          verifiedAt: "2026-09-11T08:03:00.000Z",
          collectionTiming: "DEALER",
        },
      ],
    },
  });
  assert(!wrongGovernmentClass.valid && wrongGovernmentClass.reasons.includes("GOVERNMENT_CHARGE_REQUIRES_OFFICIAL_SOURCE"), "Dealer source must not masquerade as official government-charge evidence.");

  const jurisdictionMismatch = verifyStateCostEvidencePackage({
    packageId: "sce_mismatch",
    jurisdiction: "OK",
    ruleSources: ["https://oklahoma.gov/service/all-services/auto-vehicle/fees.html"],
    evidence: [],
    calculationInput: { jurisdiction: "TX", startingVehiclePrice: 30000 },
  });
  assert(!jurisdictionMismatch.valid && jurisdictionMismatch.reasons.includes("CALCULATION_JURISDICTION_MISMATCH"), "Cross-jurisdiction evidence reuse must fail closed.");

  const unsupported = verifyStateCostEvidencePackage({
    packageId: "sce_ca",
    jurisdiction: "CA",
    ruleSources: [],
    evidence: [],
    calculationInput: { jurisdiction: "CA", startingVehiclePrice: 30000 },
  });
  assert(!unsupported.valid && unsupported.reasons.includes("JURISDICTION_NOT_VERIFIED"), "Unsupported jurisdiction must not pass the evidence gate.");

  console.log("PASS state purchase cost evidence gate invariants");
}

run();
