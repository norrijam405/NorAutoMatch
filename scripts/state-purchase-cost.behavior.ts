import { evaluateStatePurchaseCost } from "../src/lib/state-purchase-cost";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function run() {
  const california = evaluateStatePurchaseCost({
    jurisdiction: "CA",
    startingVehiclePrice: 25000,
    docFee: 100,
  });
  assert(california.truthState === "UNVERIFIED_DO_NOT_CALCULATE", "Unverified jurisdiction must fail closed.");
  assert(california.startingVehiclePrice === 25000, "Starting vehicle price should remain displayable as starting price.");
  assert(california.dueAtDealer === undefined, "Unverified jurisdiction must not emit due-at-dealer purchase-cost calculation.");
  assert(california.estimatedPurchaseTotal === undefined, "Unverified jurisdiction must not emit a purchase total.");

  const oklahomaPartial = evaluateStatePurchaseCost({
    jurisdiction: "ok",
    startingVehiclePrice: 19970,
    docFee: 499,
  });
  assert(oklahomaPartial.truthState === "PARTIALLY_VERIFIED", "Oklahoma should expose only the verified bounded workflow.");
  assert(oklahomaPartial.dueAtDealer === 20469, "Source-supported dealer subtotal should be preserved for Oklahoma.");
  assert(oklahomaPartial.estimatedPurchaseTotal === undefined, "Oklahoma must not invent state charges or a total.");

  const oklahomaIncompleteGovernment = evaluateStatePurchaseCost({
    jurisdiction: "OK",
    startingVehiclePrice: 19970,
    verifiedAdditionalGovernmentCharges: [
      {
        amount: 125,
        provenance: "official-current-fee-receipt",
        verifiedAt: "2026-09-11",
        collectionTiming: "LATER",
      },
    ],
  });
  assert(oklahomaIncompleteGovernment.dueLaterToStateOrLocalAuthority === 125, "Verified later Oklahoma charge should stay in later bucket.");
  assert(oklahomaIncompleteGovernment.estimatedPurchaseTotal === undefined, "Partial government-charge evidence must not create a total.");

  const texasNoBasis = evaluateStatePurchaseCost({
    jurisdiction: "TX",
    startingVehiclePrice: 30000,
    docFee: 225,
    ordinaryDealerSale: true,
  });
  assert(texasNoBasis.motorVehicleSalesTax === undefined, "Texas tax must not be calculated without verified tax basis.");
  assert(texasNoBasis.truthState === "PARTIALLY_VERIFIED", "Texas without tax basis must remain partial.");
  assert(texasNoBasis.estimatedPurchaseTotal === undefined, "Texas without complete material charges must not emit total.");

  const texasVerified = evaluateStatePurchaseCost({
    jurisdiction: "TX",
    startingVehiclePrice: 30000,
    docFee: 225,
    ordinaryDealerSale: true,
    taxBasisAmount: 28000,
    taxBasisProvenance: "deal-specific-verified-tax-basis",
    verifiedAdditionalGovernmentCharges: [
      {
        amount: 75,
        provenance: "official-current-title-fee",
        verifiedAt: "2026-09-11",
        collectionTiming: "DEALER",
      },
      {
        amount: 50,
        provenance: "official-current-later-local-fee",
        verifiedAt: "2026-09-11",
        collectionTiming: "LATER",
      },
    ],
    governmentChargesComplete: true,
  });
  assert(texasVerified.motorVehicleSalesTax === 1750, "Texas 6.25% tax should apply only to supplied verified basis.");
  assert(texasVerified.dueAtDealer === 32050, "Texas dealer bucket should include vehicle, dealer fee, verified tax, and dealer-collected government charge.");
  assert(texasVerified.dueLaterToStateOrLocalAuthority === 50, "Later government charge must remain outside dealer bucket.");
  assert(texasVerified.estimatedPurchaseTotal === 32100, "Complete verified inputs should produce an estimated purchase total.");
  assert(texasVerified.truthState === "VERIFIED_CURRENT", "Complete verified Texas inputs may reach VERIFIED_CURRENT for the bounded runtime.");
  assert(texasVerified.labels.total === "ESTIMATED_PURCHASE_TOTAL", "Runtime must not label computed result as final/true OTD.");

  let rejectedFalseCompleteness = false;
  try {
    evaluateStatePurchaseCost({
      jurisdiction: "TX",
      startingVehiclePrice: 30000,
      governmentChargesComplete: true,
    });
  } catch {
    rejectedFalseCompleteness = true;
  }
  assert(rejectedFalseCompleteness, "Completeness claim without verified government-charge evidence must fail closed.");

  console.log("PASS state purchase cost truth invariants");
}

run();
