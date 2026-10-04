import assert from "node:assert/strict";
import {
  evaluateCostRegression,
  type CostRegressionPolicy,
  type CostRegressionSnapshot,
} from "../src/lib/cost-regression";

const policy: CostRegressionPolicy = {
  materialKnownDirectCostIncreasePercent: 10,
  materialPaidProviderCallIncreasePercent: 0,
  materialRetryIncreasePercent: 25,
  unknownBecomingKnownHigherCostRequiresReview: true,
  knownBecomingUnknownRequiresReview: true,
  newUnknownCostCategoryRequiresReview: true,
};

function snapshot(overrides: Partial<CostRegressionSnapshot> = {}): CostRegressionSnapshot {
  return {
    ref: "baseline",
    truthState: "PARTIAL_MEASURED",
    knownDirectCostUsd: 0,
    totalCostUsd: null,
    paidProviderCalls: 0,
    retryCount: 0,
    contextTokens: null,
    computeMilliseconds: null,
    unknownCostCategories: [
      "HOSTING_ALLOCATION",
      "DATABASE_ALLOCATION",
      "NETWORK_ALLOCATION",
      "HUMAN_REVIEW_ALLOCATION",
    ],
    ...overrides,
  };
}

const baseline = snapshot();

const same = evaluateCostRegression({
  baseline,
  candidate: snapshot({ ref: "same" }),
  policy,
});
assert.equal(same.state, "PASS_NO_MATERIAL_REGRESSION");
assert.deepEqual(same.reasons, []);
assert.equal(same.authorityEffect, "NONE");

const paidCallIntroduced = evaluateCostRegression({
  baseline,
  candidate: snapshot({ ref: "paid-call", knownDirectCostUsd: 0.01, paidProviderCalls: 1 }),
  policy,
});
assert.equal(paidCallIntroduced.state, "REVIEW_REQUIRED_MATERIAL_REGRESSION");
assert.ok(paidCallIntroduced.reasons.includes("KNOWN_DIRECT_COST_MATERIAL_INCREASE"));
assert.ok(paidCallIntroduced.reasons.includes("PAID_PROVIDER_CALLS_MATERIAL_INCREASE"));

const retryIncrease = evaluateCostRegression({
  baseline: snapshot({ ref: "retry-base", retryCount: 4 }),
  candidate: snapshot({ ref: "retry-candidate", retryCount: 6 }),
  policy,
});
assert.equal(retryIncrease.state, "REVIEW_REQUIRED_MATERIAL_REGRESSION");
assert.ok(retryIncrease.reasons.includes("RETRY_COUNT_MATERIAL_INCREASE"));

const knownBecameUnknown = evaluateCostRegression({
  baseline: snapshot({ ref: "known-base", knownDirectCostUsd: 1, totalCostUsd: 2 }),
  candidate: snapshot({ ref: "unknown-candidate", knownDirectCostUsd: null, totalCostUsd: null }),
  policy,
});
assert.equal(knownBecameUnknown.state, "REVIEW_REQUIRED_MATERIAL_REGRESSION");
assert.ok(knownBecameUnknown.reasons.includes("KNOWN_COST_SIGNAL_BECAME_UNKNOWN"));

const newlyKnownTotal = evaluateCostRegression({
  baseline,
  candidate: snapshot({ ref: "known-total", totalCostUsd: 0.5 }),
  policy,
});
assert.equal(newlyKnownTotal.state, "REVIEW_REQUIRED_MATERIAL_REGRESSION");
assert.ok(newlyKnownTotal.reasons.includes("TOTAL_COST_NEWLY_KNOWN_NONZERO"));

const newUnknownCategory = evaluateCostRegression({
  baseline,
  candidate: snapshot({
    ref: "new-unknown",
    unknownCostCategories: [...baseline.unknownCostCategories, "NEW_PROVIDER_SURCHARGE"],
  }),
  policy,
});
assert.equal(newUnknownCategory.state, "REVIEW_REQUIRED_MATERIAL_REGRESSION");
assert.ok(newUnknownCategory.reasons.some((reason) => reason.startsWith("NEW_UNKNOWN_COST_CATEGORIES:")));

const noCostSignal = evaluateCostRegression({
  baseline,
  candidate: snapshot({
    ref: "no-signal",
    knownDirectCostUsd: null,
    totalCostUsd: null,
    paidProviderCalls: null,
    retryCount: null,
    contextTokens: null,
    computeMilliseconds: null,
  }),
  policy,
});
assert.equal(noCostSignal.state, "FAIL_CLOSED_INSUFFICIENT_COST_EVIDENCE");
assert.deepEqual(noCostSignal.reasons, ["NO_USABLE_CANDIDATE_COST_SIGNAL"]);

assert.throws(
  () => evaluateCostRegression({
    baseline,
    candidate: snapshot({ ref: "negative", knownDirectCostUsd: -1 }),
    policy,
  }),
  /nonnegative/,
);

assert.throws(
  () => evaluateCostRegression({
    baseline,
    candidate: snapshot({ ref: "bad-policy" }),
    policy: { ...policy, materialKnownDirectCostIncreasePercent: -1 },
  }),
  /nonnegative/,
);

console.log("Cost regression behavior challenges: PASS");
