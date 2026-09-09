import { normalizeOrrAlgoliaDiscovery } from "./orr-algolia-normalizer";
import { selectCustomerInventory } from "./inventory-runtime";
import { inventory as demoInventory } from "./inventory";
import type { OrrAlgoliaDiscovery } from "./orr-public-algolia";

export type InventoryShadowReceipt = {
  protocol: "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1";
  truthState: "PUBLIC_SOURCE_SHADOW_OBSERVATION";
  customerVisibleLiveInventory: false;
  authorityEffect: "NONE";
  source: {
    dealerId: 2175;
    sourceUrl: string;
    sourceHash: string;
    fetchedAt: string;
    indexName: string;
    pagesFetched: number;
    reportedHitCount: number;
    rawHitCount: number;
  };
  normalization: {
    normalizedCount: number;
    eligibleCount: number;
    rejectedCount: number;
    warningCount: number;
    errorCount: number;
  };
  gate: {
    status: "PASS" | "FAIL";
    reasons: string[];
  };
  proves: readonly ["READ_ONLY_PUBLIC_SOURCE_OBSERVATION"];
  doesNotProve: readonly [
    "CUSTOMER_VISIBLE_LIVE_INVENTORY",
    "PRODUCTION_DEPLOYMENT",
    "PRODUCTION_AUTHORITY",
    "FUTURE_SOURCE_AVAILABILITY",
    "VENDOR_API_AUTHORIZATION",
  ];
};

export function buildInventoryShadowReceipt(discovery: OrrAlgoliaDiscovery): InventoryShadowReceipt {
  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const runtime = {
    requestedMode: "live-shadow" as const,
    effectiveMode: "live-enabled" as const,
    customerVisibleLiveInventory: false,
    reason: "SHADOW_REQUESTED" as const,
  };
  const bridge = selectCustomerInventory({
    runtime,
    demoInventory,
    liveRecords: normalized.records,
    nowMs: Date.parse(discovery.fetchedAt),
  });

  const warningCount = normalized.issues.filter((issue) => issue.severity === "WARNING").length;
  const errorCount = normalized.issues.filter((issue) => issue.severity === "ERROR").length;
  const reasons: string[] = [];

  if (discovery.dealerId !== 2175) reasons.push("DEALER_BOUNDARY_MISMATCH");
  if (!discovery.completeSnapshot) reasons.push("SNAPSHOT_INCOMPLETE");
  if (discovery.hits.length !== discovery.reportedHitCount) reasons.push("HIT_COUNT_MISMATCH");
  if (discovery.reportedHitCount <= 0) reasons.push("ZERO_REPORTED_INVENTORY");
  if (normalized.records.length <= 0) reasons.push("ZERO_NORMALIZED_INVENTORY");
  if (errorCount > 0) reasons.push("NORMALIZATION_ERRORS_PRESENT");
  if (bridge.vehicles.length <= 0) reasons.push("ZERO_MATCH_ELIGIBLE_INVENTORY");

  return {
    protocol: "NORAUTO_INVENTORY_SHADOW_RECEIPT_V1",
    truthState: "PUBLIC_SOURCE_SHADOW_OBSERVATION",
    customerVisibleLiveInventory: false,
    authorityEffect: "NONE",
    source: {
      dealerId: 2175,
      sourceUrl: discovery.sourceUrl,
      sourceHash: discovery.sourceHash,
      fetchedAt: discovery.fetchedAt,
      indexName: discovery.indexName,
      pagesFetched: discovery.pagesFetched,
      reportedHitCount: discovery.reportedHitCount,
      rawHitCount: discovery.hits.length,
    },
    normalization: {
      normalizedCount: normalized.records.length,
      eligibleCount: bridge.vehicles.length,
      rejectedCount: bridge.rejected.length,
      warningCount,
      errorCount,
    },
    gate: {
      status: reasons.length === 0 ? "PASS" : "FAIL",
      reasons,
    },
    proves: ["READ_ONLY_PUBLIC_SOURCE_OBSERVATION"],
    doesNotProve: [
      "CUSTOMER_VISIBLE_LIVE_INVENTORY",
      "PRODUCTION_DEPLOYMENT",
      "PRODUCTION_AUTHORITY",
      "FUTURE_SOURCE_AVAILABILITY",
      "VENDOR_API_AUTHORIZATION",
    ],
  };
}
