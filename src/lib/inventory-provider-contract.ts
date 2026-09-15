export type InventoryProviderRecord = {
  providerId: string;
  dealershipId: string;
  dealershipName: string;
  sourceUrl: string;
  sourceRecordId: string;
  sourceFetchedAt: string;
  sourceHash: string;
  vin: string;
  stockNumber?: string;
  modelYear: string;
  make: string;
  model: string;
  trim?: string;
  condition?: string;
  price?: number;
  marketPrice?: number;
  discountAmount?: number;
  docFee?: number;
  displayedDealerSubtotal?: number;
  msrp?: number;
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  drivetrain?: string;
  transmission?: string;
  engine?: string;
  horsepower?: number;
  doors?: number;
  fuelType?: string;
  cityMpg?: number;
  highwayMpg?: number;
  bodyType?: string;
  availabilityState: "observed" | "active" | "missing-once" | "missing-repeatedly" | "unavailable-confirmed";
  inTransit?: boolean;
  features: string[];
  sourcePhotos: Array<{ url: string; sourceHash?: string }>;
  vehicleUrl?: string;
};

export type InventoryProviderSnapshot = {
  providerId: string;
  dealershipId: string;
  dealershipName: string;
  authorized: boolean;
  fetchedAt: string;
  sourceUrl: string;
  sourceHash: string;
  records: InventoryProviderRecord[];
};

export interface InventoryProviderAdapter {
  readonly providerId: string;
  fetchSnapshot(): Promise<InventoryProviderSnapshot>;
}

export function assertProviderSnapshotBoundary(snapshot: InventoryProviderSnapshot): InventoryProviderSnapshot {
  if (!snapshot.authorized) throw new Error("INVENTORY_PROVIDER_NOT_AUTHORIZED");
  if (!snapshot.providerId.trim()) throw new Error("INVENTORY_PROVIDER_ID_REQUIRED");
  if (!snapshot.dealershipId.trim()) throw new Error("INVENTORY_DEALERSHIP_ID_REQUIRED");
  if (!snapshot.sourceUrl.trim()) throw new Error("INVENTORY_SOURCE_URL_REQUIRED");
  if (!snapshot.sourceHash.trim()) throw new Error("INVENTORY_SOURCE_HASH_REQUIRED");

  const vins = new Set<string>();
  for (const record of snapshot.records) {
    const vin = record.vin.trim().toUpperCase();
    if (!vin) throw new Error("INVENTORY_VIN_REQUIRED");
    if (vins.has(vin)) throw new Error(`INVENTORY_DUPLICATE_VIN:${vin}`);
    vins.add(vin);
    if (record.providerId !== snapshot.providerId) throw new Error(`INVENTORY_PROVIDER_DRIFT:${vin}`);
    if (record.dealershipId !== snapshot.dealershipId) throw new Error(`INVENTORY_DEALERSHIP_DRIFT:${vin}`);
    if (!record.sourceRecordId.trim()) throw new Error(`INVENTORY_SOURCE_RECORD_ID_REQUIRED:${vin}`);
    if (!record.sourceHash.trim()) throw new Error(`INVENTORY_RECORD_SOURCE_HASH_REQUIRED:${vin}`);
    if (!record.modelYear.trim() || !record.make.trim() || !record.model.trim()) {
      throw new Error(`INVENTORY_IDENTITY_INCOMPLETE:${vin}`);
    }
  }

  return snapshot;
}
