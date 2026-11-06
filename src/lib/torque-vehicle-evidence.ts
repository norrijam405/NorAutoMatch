import type { Vehicle } from "./inventory";
import type { TorqueInventoryMode, TorqueVehicleMatch } from "./torque-inventory-assistant";

export type TorqueVehicleEvidence = {
  scope: "REPRESENTATIVE_DEMO" | "DEALER_CATALOG" | "VERIFIED_CACHED_CATALOG";
  vehicleRef: string;
  identity: "VIN" | "DEMO_ID";
  stockNumber: string | null;
  listedPrice: number | null;
  mileage: { value: number | null; state: "REPORTED" | "UNVERIFIED" };
  equipment: Array<{ label: string; state: "LISTED_IN_RECORD" }>;
  unknowns: string[];
  disclosure: string;
};

/** A dealer listing is evidence of what that catalog reports, not an independent
 * certification of equipment or a promise of availability. Do not infer fields. */
export function vehicleEvidenceForMatch(
  match: TorqueVehicleMatch,
  vehicles: Vehicle[],
  mode: TorqueInventoryMode,
): TorqueVehicleEvidence | null {
  const v = vehicles.find(vehicle => vehicle.id.toUpperCase() === match.id.toUpperCase());
  if (!v) return null;
  const isVin = /^[A-HJ-NPR-Z0-9]{17}$/i.test(v.id);
  const scope = mode === "representative-demo" ? "REPRESENTATIVE_DEMO" :
    mode === "verified-cache" ? "VERIFIED_CACHED_CATALOG" : "DEALER_CATALOG";
  const equipment: TorqueVehicleEvidence["equipment"] = [
    ...[v.drivetrain, v.transmission, v.engine, v.fuelType]
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map(label => ({ label, state: "LISTED_IN_RECORD" as const })),
    ...(v.features ?? []).filter(Boolean).slice(0, 8)
      .map(label => ({ label, state: "LISTED_IN_RECORD" as const })),
  ];
  return {
    scope,
    vehicleRef: v.id,
    identity: isVin && mode !== "representative-demo" ? "VIN" : "DEMO_ID",
    stockNumber: v.stockNumber ?? null,
    listedPrice: Number.isFinite(v.price) && v.price > 0 ? v.price : null,
    mileage: {
      value: v.mileageVerified === false || !Number.isFinite(v.mileage) ? null : v.mileage,
      state: v.mileageVerified === false || !Number.isFinite(v.mileage) ? "UNVERIFIED" : "REPORTED",
    },
    equipment,
    unknowns: [
      "Current sale availability is not guaranteed",
      "Seating capacity is not certified by this listing",
      "Equipment and accessories require exact-vehicle confirmation",
      "Out-the-door price and financing are not verified by this listing",
      ...match.compromises.slice(0, 4),
    ],
    disclosure: mode === "representative-demo"
      ? "Sample data only. Not confirmed dealer stock."
      : mode === "verified-cache"
        ? "Previously checked dealer data. Reconfirm current listing, equipment and availability."
        : "Dealer-source listing data. Equipment, price and availability still require confirmation.",
  };
}
