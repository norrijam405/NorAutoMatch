export type InventoryProviderPriority = {
  id: string;
  internalName: string;
  priority: number;
  role: "PRIMARY" | "AUTHORIZED_PARTNER" | "REFERRAL_ONLY";
  inventoryAuthorized: boolean;
  authorizationBasis: "USER_CONFIRMED_PERMISSION" | "DOCUMENTED_PARTNER_AGREEMENT" | "UNKNOWN";
  authorizationConfirmedAt?: string;
  customerVisibleInventory: boolean;
  customerVisibleLabel: string;
  customerVisibleSourceName: boolean;
  referralAuthorized: boolean;
  compensationAuthorized: boolean;
  active: boolean;
  notes?: string;
};

/**
 * Internal routing registry for NorAutoMatch inventory and referral priority.
 *
 * Customer-facing UI should use customerVisibleLabel unless a provider-specific
 * disclosure is required for the transaction or explicitly authorized.
 *
 * Inventory access, referral permission, and compensation permission are
 * separate capabilities. No field implies another.
 */
export const inventoryProviderPriority: InventoryProviderPriority[] = [
  {
    id: "orr-nissan-west",
    internalName: "Orr Nissan West",
    priority: 1,
    role: "PRIMARY",
    inventoryAuthorized: true,
    authorizationBasis: "USER_CONFIRMED_PERMISSION",
    authorizationConfirmedAt: "2026-09-12",
    customerVisibleInventory: true,
    customerVisibleLabel: "Verified inventory",
    customerVisibleSourceName: false,
    referralAuthorized: false,
    compensationAuthorized: false,
    active: true,
    notes: "Inventory use confirmed by the operator. Preserve source provenance internally while keeping ordinary discovery UI provider-neutral. Referral and compensation permissions remain separately gated.",
  },
];

export function getActiveInventoryProviders() {
  return inventoryProviderPriority
    .filter((provider) => provider.active && provider.inventoryAuthorized && provider.customerVisibleInventory)
    .sort((a, b) => a.priority - b.priority);
}

export function getReferralProviders() {
  return inventoryProviderPriority
    .filter((provider) => provider.active && provider.referralAuthorized)
    .sort((a, b) => a.priority - b.priority);
}
