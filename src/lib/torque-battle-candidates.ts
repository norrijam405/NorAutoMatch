import type { TorqueInventoryMode, TorqueVehicleMatch } from "./torque-inventory-assistant";

const VALID_VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;

/**
 * Candidates may be proposed to the exact-VIN battle endpoint ONLY when
 * they originate in a verified dealer catalog. No demo ID, duplicate VIN,
 * or fabricated fallback VIN may be used.
 */
export function chooseTorqueBattlePair(
  mode: TorqueInventoryMode | string | undefined,
  matches: readonly Pick<TorqueVehicleMatch, "id">[] | undefined,
): [string, string] | null {
  if (mode !== "verified-live" && mode !== "verified-cache") return null;
  if (!Array.isArray(matches)) return null;
  const vins: string[] = [];
  for (const match of matches.slice(0, 5)) {
    const vin = match?.id?.toUpperCase();
    if (!vin || !VALID_VIN.test(vin) || vins.includes(vin)) continue;
    vins.push(vin);
    if (vins.length === 2) return [vins[0], vins[1]];
  }
  return null;
}
