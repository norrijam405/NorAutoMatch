export type DealershipScopeId = "orr-nissan-west" | "irving-hyundai-pending";

export type DealershipScope = {
  id: DealershipScopeId;
  label: string;
  city: string;
  state: string;
  brand: "Nissan" | "Hyundai";
  lifecycle: "ACTIVE" | "PENDING_CONFIRMATION";
  inventoryIntegration: "ORR_WEST_VERIFIED_GATE" | "NOT_CONNECTED";
};

export const dealershipScopes: readonly DealershipScope[] = [
  {
    id: "orr-nissan-west",
    label: "Orr Nissan West",
    city: "Oklahoma City",
    state: "OK",
    brand: "Nissan",
    lifecycle: "ACTIVE",
    inventoryIntegration: "ORR_WEST_VERIFIED_GATE",
  },
  {
    id: "irving-hyundai-pending",
    label: "Irving Hyundai (dealership not confirmed)",
    city: "Irving",
    state: "TX",
    brand: "Hyundai",
    lifecycle: "PENDING_CONFIRMATION",
    inventoryIntegration: "NOT_CONNECTED",
  },
] as const;

export function resolveDealershipScope(value: unknown): DealershipScope | null {
  if (typeof value !== "string") return null;
  return dealershipScopes.find((scope) => scope.id === value) ?? null;
}

export function dealerInventorySearchAvailable(scope: DealershipScope) {
  return scope.lifecycle === "ACTIVE" && scope.inventoryIntegration !== "NOT_CONNECTED";
}
