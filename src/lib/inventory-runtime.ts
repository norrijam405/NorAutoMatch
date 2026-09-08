import { selectInventoryForMatcher, type InventoryBridgeResult, type InventoryMode } from "./inventory-bridge";
import type { Vehicle } from "./inventory";
import type { LiveInventoryRecord } from "./live-inventory";

export const LIVE_INVENTORY_ACTIVATION_VALUE = "ENABLE_ORR_LIVE_CUSTOMER_INVENTORY";

export type InventoryRuntimeDecision = {
  requestedMode: InventoryMode;
  effectiveMode: InventoryMode;
  customerVisibleLiveInventory: boolean;
  reason:
    | "DEMO_REQUESTED"
    | "SHADOW_REQUESTED"
    | "LIVE_ACTIVATED"
    | "LIVE_ACTIVATION_MISSING"
    | "INVALID_MODE_DEFAULTED_TO_DEMO";
};

function parseMode(value: string | undefined): InventoryMode | undefined {
  if (value === "demo" || value === "live-shadow" || value === "live-enabled") return value;
  return undefined;
}

export function resolveInventoryRuntime(input: {
  mode?: string;
  liveActivation?: string;
}): InventoryRuntimeDecision {
  const parsed = parseMode(input.mode);
  if (!parsed) {
    return {
      requestedMode: "demo",
      effectiveMode: "demo",
      customerVisibleLiveInventory: false,
      reason: input.mode ? "INVALID_MODE_DEFAULTED_TO_DEMO" : "DEMO_REQUESTED",
    };
  }

  if (parsed === "demo") {
    return {
      requestedMode: parsed,
      effectiveMode: "demo",
      customerVisibleLiveInventory: false,
      reason: "DEMO_REQUESTED",
    };
  }

  if (parsed === "live-shadow") {
    return {
      requestedMode: parsed,
      effectiveMode: "live-shadow",
      customerVisibleLiveInventory: false,
      reason: "SHADOW_REQUESTED",
    };
  }

  if (input.liveActivation !== LIVE_INVENTORY_ACTIVATION_VALUE) {
    return {
      requestedMode: parsed,
      effectiveMode: "demo",
      customerVisibleLiveInventory: false,
      reason: "LIVE_ACTIVATION_MISSING",
    };
  }

  return {
    requestedMode: parsed,
    effectiveMode: "live-enabled",
    customerVisibleLiveInventory: true,
    reason: "LIVE_ACTIVATED",
  };
}

export function selectCustomerInventory(input: {
  runtime: InventoryRuntimeDecision;
  demoInventory: Vehicle[];
  liveRecords: LiveInventoryRecord[];
  nowMs?: number;
}): InventoryBridgeResult {
  return selectInventoryForMatcher({
    mode: input.runtime.effectiveMode,
    demoInventory: input.demoInventory,
    liveRecords: input.liveRecords,
    nowMs: input.nowMs,
  });
}
