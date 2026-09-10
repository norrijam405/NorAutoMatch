export type CostRegressionTruthState = "MEASURED" | "PARTIAL_MEASURED" | "ESTIMATED" | "UNKNOWN";

export type CostRegressionSnapshot = {
  ref: string;
  truthState: CostRegressionTruthState;
  knownDirectCostUsd: number | null;
  totalCostUsd: number | null;
  paidProviderCalls: number | null;
  retryCount: number | null;
  contextTokens: number | null;
  computeMilliseconds: number | null;
  unknownCostCategories: string[];
};

export type CostRegressionPolicy = {
  materialKnownDirectCostIncreasePercent: number;
  materialPaidProviderCallIncreasePercent: number;
  materialRetryIncreasePercent: number;
  unknownBecomingKnownHigherCostRequiresReview: boolean;
  knownBecomingUnknownRequiresReview: boolean;
  newUnknownCostCategoryRequiresReview: boolean;
};

export type CostRegressionDecisionState =
  | "PASS_NO_MATERIAL_REGRESSION"
  | "REVIEW_REQUIRED_MATERIAL_REGRESSION"
  | "FAIL_CLOSED_INSUFFICIENT_COST_EVIDENCE";

export type CostRegressionDecision = {
  protocol: "IGNIAQUA_COST_REGRESSION_DECISION_V1";
  baselineRef: string;
  candidateRef: string;
  state: CostRegressionDecisionState;
  reasons: string[];
  authorityEffect: "NONE";
};

function requireNonnegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite nonnegative number.`);
  }
}

function validateSnapshot(snapshot: CostRegressionSnapshot, label: string) {
  if (!snapshot.ref.trim()) throw new Error(`${label} ref is required.`);
  for (const [key, value] of Object.entries({
    knownDirectCostUsd: snapshot.knownDirectCostUsd,
    totalCostUsd: snapshot.totalCostUsd,
    paidProviderCalls: snapshot.paidProviderCalls,
    retryCount: snapshot.retryCount,
    contextTokens: snapshot.contextTokens,
    computeMilliseconds: snapshot.computeMilliseconds,
  })) {
    if (value !== null) requireNonnegative(value, `${label}.${key}`);
  }
}

function percentIncrease(baseline: number, candidate: number): number {
  if (candidate <= baseline) return 0;
  if (baseline === 0) return Number.POSITIVE_INFINITY;
  return ((candidate - baseline) / baseline) * 100;
}

function materiallyIncreased(
  baseline: number | null,
  candidate: number | null,
  thresholdPercent: number,
): boolean {
  if (baseline === null || candidate === null) return false;
  return percentIncrease(baseline, candidate) > thresholdPercent;
}

export function evaluateCostRegression(input: {
  baseline: CostRegressionSnapshot;
  candidate: CostRegressionSnapshot;
  policy: CostRegressionPolicy;
}): CostRegressionDecision {
  validateSnapshot(input.baseline, "baseline");
  validateSnapshot(input.candidate, "candidate");
  requireNonnegative(
    input.policy.materialKnownDirectCostIncreasePercent,
    "materialKnownDirectCostIncreasePercent",
  );
  requireNonnegative(
    input.policy.materialPaidProviderCallIncreasePercent,
    "materialPaidProviderCallIncreasePercent",
  );
  requireNonnegative(
    input.policy.materialRetryIncreasePercent,
    "materialRetryIncreasePercent",
  );

  const reasons: string[] = [];

  if (
    materiallyIncreased(
      input.baseline.knownDirectCostUsd,
      input.candidate.knownDirectCostUsd,
      input.policy.materialKnownDirectCostIncreasePercent,
    )
  ) {
    reasons.push("KNOWN_DIRECT_COST_MATERIAL_INCREASE");
  }

  if (
    materiallyIncreased(
      input.baseline.paidProviderCalls,
      input.candidate.paidProviderCalls,
      input.policy.materialPaidProviderCallIncreasePercent,
    )
  ) {
    reasons.push("PAID_PROVIDER_CALLS_MATERIAL_INCREASE");
  }

  if (
    materiallyIncreased(
      input.baseline.retryCount,
      input.candidate.retryCount,
      input.policy.materialRetryIncreasePercent,
    )
  ) {
    reasons.push("RETRY_COUNT_MATERIAL_INCREASE");
  }

  if (
    input.policy.knownBecomingUnknownRequiresReview &&
    (
      (input.baseline.knownDirectCostUsd !== null && input.candidate.knownDirectCostUsd === null) ||
      (input.baseline.totalCostUsd !== null && input.candidate.totalCostUsd === null) ||
      (input.baseline.paidProviderCalls !== null && input.candidate.paidProviderCalls === null) ||
      (input.baseline.retryCount !== null && input.candidate.retryCount === null)
    )
  ) {
    reasons.push("KNOWN_COST_SIGNAL_BECAME_UNKNOWN");
  }

  if (
    input.policy.unknownBecomingKnownHigherCostRequiresReview &&
    input.baseline.totalCostUsd === null &&
    input.candidate.totalCostUsd !== null &&
    input.candidate.totalCostUsd > 0
  ) {
    reasons.push("TOTAL_COST_NEWLY_KNOWN_NONZERO");
  }

  if (input.policy.newUnknownCostCategoryRequiresReview) {
    const baselineUnknown = new Set(input.baseline.unknownCostCategories);
    const added = input.candidate.unknownCostCategories.filter((item) => !baselineUnknown.has(item));
    if (added.length > 0) reasons.push(`NEW_UNKNOWN_COST_CATEGORIES:${[...new Set(added)].sort().join(",")}`);
  }

  const candidateHasNoUsableCostSignal =
    input.candidate.knownDirectCostUsd === null &&
    input.candidate.totalCostUsd === null &&
    input.candidate.paidProviderCalls === null &&
    input.candidate.retryCount === null &&
    input.candidate.contextTokens === null &&
    input.candidate.computeMilliseconds === null;

  if (candidateHasNoUsableCostSignal) {
    return {
      protocol: "IGNIAQUA_COST_REGRESSION_DECISION_V1",
      baselineRef: input.baseline.ref,
      candidateRef: input.candidate.ref,
      state: "FAIL_CLOSED_INSUFFICIENT_COST_EVIDENCE",
      reasons: ["NO_USABLE_CANDIDATE_COST_SIGNAL"],
      authorityEffect: "NONE",
    };
  }

  return {
    protocol: "IGNIAQUA_COST_REGRESSION_DECISION_V1",
    baselineRef: input.baseline.ref,
    candidateRef: input.candidate.ref,
    state: reasons.length > 0
      ? "REVIEW_REQUIRED_MATERIAL_REGRESSION"
      : "PASS_NO_MATERIAL_REGRESSION",
    reasons,
    authorityEffect: "NONE",
  };
}
