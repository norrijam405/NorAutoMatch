export type GarageSaveBaseline = {
  vin: string;
  price: number | null;
  mileage: number | null;
  created_at: string;
};

export type GarageCurrentVehicle = {
  vin: string;
  price: number | null;
  mileage: number | null;
};

export type GarageChangeSignal = {
  vin: string;
  savedAt: string | null;
  priceDelta: number | null;
  mileageDelta: number | null;
  currentInventoryPresent: boolean;
};

export function buildGarageChangeSignals(
  baselines: GarageSaveBaseline[],
  currentVehicles: GarageCurrentVehicle[],
): Map<string, GarageChangeSignal> {
  const latestBaselineByVin = new Map<string, GarageSaveBaseline>();
  for (const baseline of baselines) {
    const existing = latestBaselineByVin.get(baseline.vin);
    if (!existing || Date.parse(baseline.created_at) > Date.parse(existing.created_at)) {
      latestBaselineByVin.set(baseline.vin, baseline);
    }
  }

  const currentByVin = new Map(currentVehicles.map((vehicle) => [vehicle.vin, vehicle]));
  const vins = new Set([...latestBaselineByVin.keys(), ...currentByVin.keys()]);
  const result = new Map<string, GarageChangeSignal>();

  for (const vin of vins) {
    const baseline = latestBaselineByVin.get(vin);
    const current = currentByVin.get(vin);
    result.set(vin, {
      vin,
      savedAt: baseline?.created_at ?? null,
      priceDelta:
        baseline?.price != null && current?.price != null
          ? Number(current.price) - Number(baseline.price)
          : null,
      mileageDelta:
        baseline?.mileage != null && current?.mileage != null
          ? Number(current.mileage) - Number(baseline.mileage)
          : null,
      currentInventoryPresent: Boolean(current),
    });
  }

  return result;
}
