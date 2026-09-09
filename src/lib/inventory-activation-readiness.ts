import type { InventoryShadowReceipt } from "./inventory-shadow-receipt";
import type { ProductionReadinessResult } from "./production-readiness";

export type InventoryActivationReadiness = {
  protocol: "NORAUTO_INVENTORY_ACTIVATION_READINESS_V1";
  truthState: "CONTROLLED_ACTIVATION_REVIEW_PREREQUISITES_ONLY";
  readyForControlledReview: boolean;
  authorityEffect: "NONE";
  customerVisibleLiveInventory: false;
  checks: Array<{
    id:
      | "PRODUCTION_CONFIG_PREFLIGHT"
      | "SHADOW_GATE"
      | "DEALER_BOUNDARY"
      | "SHADOW_NOT_CUSTOMER_VISIBLE"
      | "OBSERVATION_FRESHNESS";
    status: "PASS" | "FAIL";
    message: string;
  }>;
  observedAt: string;
  observationAgeMs: number | null;
  proves: readonly ["ACTIVATION_REVIEW_PREREQUISITE_EVALUATION"];
  doesNotProve: readonly [
    "CUSTOMER_VISIBLE_LIVE_INVENTORY",
    "ACTIVATION_AUTHORITY",
    "PRODUCTION_DEPLOYMENT",
    "VENDOR_API_AUTHORIZATION",
    "FUTURE_SOURCE_AVAILABILITY",
  ];
};

const MAX_SHADOW_AGE_MS = 15 * 60 * 1000;

export function evaluateInventoryActivationReadiness(input: {
  production: ProductionReadinessResult;
  shadow: InventoryShadowReceipt;
  nowMs?: number;
}): InventoryActivationReadiness {
  const nowMs = input.nowMs ?? Date.now();
  const fetchedMs = Date.parse(input.shadow.source.fetchedAt);
  const ageMs = Number.isFinite(fetchedMs) ? nowMs - fetchedMs : null;
  const freshnessPass = ageMs !== null && ageMs >= 0 && ageMs <= MAX_SHADOW_AGE_MS;

  const checks: InventoryActivationReadiness["checks"] = [
    {
      id: "PRODUCTION_CONFIG_PREFLIGHT",
      status: input.production.ready ? "PASS" : "FAIL",
      message: input.production.ready
        ? "Static production configuration preflight passes."
        : "Static production configuration preflight does not pass.",
    },
    {
      id: "SHADOW_GATE",
      status: input.shadow.gate.status === "PASS" ? "PASS" : "FAIL",
      message: input.shadow.gate.status === "PASS"
        ? "Read-only public-source shadow observation passes its source-health gate."
        : "Read-only public-source shadow observation does not pass its source-health gate.",
    },
    {
      id: "DEALER_BOUNDARY",
      status: input.shadow.source.dealerId === 2175 ? "PASS" : "FAIL",
      message: input.shadow.source.dealerId === 2175
        ? "Shadow evidence is bound to Orr Nissan West dealer 2175."
        : "Shadow evidence is not bound to the expected dealer identity.",
    },
    {
      id: "SHADOW_NOT_CUSTOMER_VISIBLE",
      status: input.shadow.customerVisibleLiveInventory === false ? "PASS" : "FAIL",
      message: input.shadow.customerVisibleLiveInventory === false
        ? "Evidence was collected without enabling customer-visible live inventory."
        : "Readiness evidence must not originate from a customer-visible live state.",
    },
    {
      id: "OBSERVATION_FRESHNESS",
      status: freshnessPass ? "PASS" : "FAIL",
      message: freshnessPass
        ? "Shadow observation is within the 15-minute controlled-review freshness window."
        : "Shadow observation is missing, future-dated, or older than the 15-minute controlled-review freshness window.",
    },
  ];

  return {
    protocol: "NORAUTO_INVENTORY_ACTIVATION_READINESS_V1",
    truthState: "CONTROLLED_ACTIVATION_REVIEW_PREREQUISITES_ONLY",
    readyForControlledReview: checks.every((check) => check.status === "PASS"),
    authorityEffect: "NONE",
    customerVisibleLiveInventory: false,
    checks,
    observedAt: input.shadow.source.fetchedAt,
    observationAgeMs: ageMs,
    proves: ["ACTIVATION_REVIEW_PREREQUISITE_EVALUATION"],
    doesNotProve: [
      "CUSTOMER_VISIBLE_LIVE_INVENTORY",
      "ACTIVATION_AUTHORITY",
      "PRODUCTION_DEPLOYMENT",
      "VENDOR_API_AUTHORIZATION",
      "FUTURE_SOURCE_AVAILABILITY",
    ],
  };
}
