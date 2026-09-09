import type { InventoryShadowReceipt } from "./inventory-shadow-receipt";

export type InventoryShadowDrift = {
  protocol: "NORAUTO_INVENTORY_SHADOW_DRIFT_V1";
  truthState: "SHADOW_OBSERVATION_COMPARISON_ONLY";
  authorityEffect: "NONE";
  customerVisibleLiveInventory: false;
  previousFetchedAt: string;
  currentFetchedAt: string;
  sourceIdentity: {
    dealerStable: boolean;
    indexStable: boolean;
    sourceUrlStable: boolean;
    sourceHashChanged: boolean;
  };
  deltas: {
    rawHitCount: number;
    normalizedCount: number;
    eligibleCount: number;
    warningCount: number;
    errorCount: number;
    blockingErrorCount: number;
    inactiveExcludedCount: number;
  };
  issueCodeChanges: Array<{
    code: string;
    previous: number;
    current: number;
    delta: number;
  }>;
  observations: string[];
  proves: readonly ["COMPARISON_OF_TWO_SHADOW_RECEIPTS"];
  doesNotProve: readonly [
    "CUSTOMER_VISIBLE_LIVE_INVENTORY",
    "PRODUCTION_DEPLOYMENT",
    "PRODUCTION_AUTHORITY",
    "SOURCE_STABILITY_OVER_TIME",
    "VEHICLE_SOLD_OR_REMOVED",
  ];
};

function delta(current: number, previous: number) {
  return current - previous;
}

export function compareInventoryShadowReceipts(previous: InventoryShadowReceipt, current: InventoryShadowReceipt): InventoryShadowDrift {
  if (previous.protocol !== "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1" || current.protocol !== "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1") {
    throw new Error("Shadow drift comparison requires two inventory shadow receipts.");
  }

  const previousMs = Date.parse(previous.source.fetchedAt);
  const currentMs = Date.parse(current.source.fetchedAt);
  if (!Number.isFinite(previousMs) || !Number.isFinite(currentMs) || currentMs <= previousMs) {
    throw new Error("Current shadow receipt must be newer than previous shadow receipt.");
  }

  const codes = [...new Set([
    ...Object.keys(previous.normalization.issueCounts),
    ...Object.keys(current.normalization.issueCounts),
  ])].sort();

  const issueCodeChanges = codes.map((code) => {
    const previousCount = previous.normalization.issueCounts[code] ?? 0;
    const currentCount = current.normalization.issueCounts[code] ?? 0;
    return { code, previous: previousCount, current: currentCount, delta: currentCount - previousCount };
  }).filter((change) => change.delta !== 0);

  const observations: string[] = [];
  if (previous.source.dealerId !== current.source.dealerId) observations.push("DEALER_ID_CHANGED");
  if (previous.source.indexName !== current.source.indexName) observations.push("INDEX_NAME_CHANGED");
  if (previous.source.sourceUrl !== current.source.sourceUrl) observations.push("SOURCE_URL_CHANGED");
  if (previous.source.sourceHash !== current.source.sourceHash) observations.push("SOURCE_HASH_CHANGED");
  if (previous.gate.status !== current.gate.status) observations.push(`GATE_${previous.gate.status}_TO_${current.gate.status}`);
  if (previous.normalization.blockingErrorCount === 0 && current.normalization.blockingErrorCount > 0) observations.push("BLOCKING_ERRORS_INTRODUCED");
  if (previous.normalization.eligibleCount > 0 && current.normalization.eligibleCount === 0) observations.push("MATCH_ELIGIBLE_INVENTORY_DROPPED_TO_ZERO");
  if (current.source.rawHitCount !== previous.source.rawHitCount) observations.push("RAW_HIT_COUNT_CHANGED");
  if (current.normalization.eligibleCount !== previous.normalization.eligibleCount) observations.push("ELIGIBLE_COUNT_CHANGED");
  if (issueCodeChanges.length > 0) observations.push("ISSUE_COUNTS_CHANGED");

  return {
    protocol: "NORAUTO_INVENTORY_SHADOW_DRIFT_V1",
    truthState: "SHADOW_OBSERVATION_COMPARISON_ONLY",
    authorityEffect: "NONE",
    customerVisibleLiveInventory: false,
    previousFetchedAt: previous.source.fetchedAt,
    currentFetchedAt: current.source.fetchedAt,
    sourceIdentity: {
      dealerStable: previous.source.dealerId === current.source.dealerId,
      indexStable: previous.source.indexName === current.source.indexName,
      sourceUrlStable: previous.source.sourceUrl === current.source.sourceUrl,
      sourceHashChanged: previous.source.sourceHash !== current.source.sourceHash,
    },
    deltas: {
      rawHitCount: delta(current.source.rawHitCount, previous.source.rawHitCount),
      normalizedCount: delta(current.normalization.normalizedCount, previous.normalization.normalizedCount),
      eligibleCount: delta(current.normalization.eligibleCount, previous.normalization.eligibleCount),
      warningCount: delta(current.normalization.warningCount, previous.normalization.warningCount),
      errorCount: delta(current.normalization.errorCount, previous.normalization.errorCount),
      blockingErrorCount: delta(current.normalization.blockingErrorCount, previous.normalization.blockingErrorCount),
      inactiveExcludedCount: delta(current.normalization.inactiveExcludedCount, previous.normalization.inactiveExcludedCount),
    },
    issueCodeChanges,
    observations,
    proves: ["COMPARISON_OF_TWO_SHADOW_RECEIPTS"],
    doesNotProve: [
      "CUSTOMER_VISIBLE_LIVE_INVENTORY",
      "PRODUCTION_DEPLOYMENT",
      "PRODUCTION_AUTHORITY",
      "SOURCE_STABILITY_OVER_TIME",
      "VEHICLE_SOLD_OR_REMOVED",
    ],
  };
}
