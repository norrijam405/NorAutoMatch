import type { InventoryCatalog } from "./inventory-catalog";

export type LeadInventoryEvidenceState =
  | "NO_SHORTLIST"
  | "REPRESENTATIVE_ONLY"
  | "VERIFIED_LIVE"
  | "PARTIALLY_VERIFIED_LIVE"
  | "LIVE_SOURCE_UNAVAILABLE";

export type LeadInventoryEvidence = {
  state: LeadInventoryEvidenceState;
  requestedVehicleIds: string[];
  verifiedVehicleIds: string[];
  unverifiedVehicleIds: string[];
  catalogSource?: InventoryCatalog["source"];
  catalogGeneratedAt?: string;
  sourceFetchedAt?: string;
  sourceHash?: string;
};

export function classifyLeadInventoryEvidence(input: {
  shortlistedVehicleIds: string[];
  catalog?: InventoryCatalog;
  sourceUnavailable?: boolean;
}): LeadInventoryEvidence {
  const requested = [...new Set(input.shortlistedVehicleIds.filter(Boolean))];

  if (requested.length === 0) {
    return { state: "NO_SHORTLIST", requestedVehicleIds: [], verifiedVehicleIds: [], unverifiedVehicleIds: [] };
  }

  if (input.sourceUnavailable || !input.catalog) {
    return {
      state: "LIVE_SOURCE_UNAVAILABLE",
      requestedVehicleIds: requested,
      verifiedVehicleIds: [],
      unverifiedVehicleIds: requested,
    };
  }

  if (!input.catalog.customerVisibleLiveInventory || input.catalog.source !== "orr-live") {
    return {
      state: "REPRESENTATIVE_ONLY",
      requestedVehicleIds: requested,
      verifiedVehicleIds: [],
      unverifiedVehicleIds: requested,
      catalogSource: input.catalog.source,
      catalogGeneratedAt: input.catalog.generatedAt,
    };
  }

  const liveIds = new Set(input.catalog.vehicles.map((vehicle) => vehicle.id));
  const verified = requested.filter((id) => liveIds.has(id));
  const unverified = requested.filter((id) => !liveIds.has(id));

  return {
    state: unverified.length === 0 ? "VERIFIED_LIVE" : "PARTIALLY_VERIFIED_LIVE",
    requestedVehicleIds: requested,
    verifiedVehicleIds: verified,
    unverifiedVehicleIds: unverified,
    catalogSource: input.catalog.source,
    catalogGeneratedAt: input.catalog.generatedAt,
    sourceFetchedAt: input.catalog.sourceEvidence?.fetchedAt,
    sourceHash: input.catalog.sourceEvidence?.sourceHash,
  };
}
