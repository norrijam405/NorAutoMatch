import type { Vehicle } from "./inventory";
import type { TorqueInventoryMode, TorqueVehicleMatch } from "./torque-inventory-assistant";

/** Customer-facing, read-only explanation of why the FIRST two shortlisted
 * dealer VINs differ. Only compare like-for-like known source fields.
 * No financing estimates, unknown equipment assumptions, or invented ratings.
 */
export type TorqueChoiceGuide = {
  state: "DEALER_LISTING_COMPARISON";
  sourceNote: string;
  vehicles: Array<{ vin: string; label: string; listedPrice: number; reasons: string[]; gaps: string[] }>;
  comparisons: string[];
  nextQuestion: string;
};

export function buildTorqueChoiceGuide(input: {
  matches: TorqueVehicleMatch[];
  vehicles: Vehicle[];
  mode: TorqueInventoryMode;
}): TorqueChoiceGuide | null {
  if (input.mode === "representative-demo" || input.matches.length < 2) return null;
  const vin = (id: string) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(id);
  const byVin = new Map(input.vehicles.map(v => [v.id.toUpperCase(), v]));
  const firstTwo = input.matches.slice(0, 2);
  if (!firstTwo.every(match => vin(match.id) && byVin.has(match.id.toUpperCase()))) return null;
  if (firstTwo[0].id.toUpperCase() === firstTwo[1].id.toUpperCase()) return null;
  const [a, b] = firstTwo.map(match => byVin.get(match.id.toUpperCase())!);
  const matches = firstTwo;
  const comparisons: string[] = [];
  if (Number.isFinite(a.price) && Number.isFinite(b.price) && a.price > 0 && b.price > 0) {
    const lower = a.price < b.price ? a : b.price < a.price ? b : null;
    comparisons.push(lower
      ? `${lower.year} ${lower.make} ${lower.model} has the lower listed price by $${Math.abs(a.price-b.price).toLocaleString("en-US")}.`
      : "Both dealer listings currently report the same asking price.");
  }
  if (a.mileageVerified !== false && b.mileageVerified !== false &&
      Number.isFinite(a.mileage) && Number.isFinite(b.mileage)) {
    const lower = a.mileage < b.mileage ? a : b.mileage < a.mileage ? b : null;
    comparisons.push(lower
      ? `${lower.year} ${lower.make} ${lower.model} has ${Math.abs(a.mileage-b.mileage).toLocaleString("en-US")} fewer source-reported miles.`
      : "Both listings report the same mileage.");
  } else {
    comparisons.push("A mileage comparison is not available for both VINs.");
  }
  const mpg = (v: Vehicle) =>
    Number.isFinite(v.cityMpg) && Number.isFinite(v.highwayMpg) &&
    v.cityMpg! > 0 && v.highwayMpg! > 0;
  if (mpg(a) && mpg(b)) {
    comparisons.push(`Listed MPG: ${a.make} ${a.model} ${a.cityMpg} city/${a.highwayMpg} highway; ${b.make} ${b.model} ${b.cityMpg} city/${b.highwayMpg} highway. Different configurations may vary.`);
  } else {
    comparisons.push("A comparable dealer-reported city/highway MPG pair is unavailable for both VINs; do not infer a fuel-economy winner.");
  }
  return {
    state: "DEALER_LISTING_COMPARISON",
    sourceNote: input.mode === "verified-cache"
      ? "Previously checked dealer listing figures; recheck both VINs before deciding."
      : "Dealer-source listing figures, not independently inspected equipment or a current availability guarantee.",
    vehicles: matches.map((match, index) => ({
      vin: match.id.toUpperCase(),
      label: match.label,
      listedPrice: index === 0 ? a.price : b.price,
      reasons: match.reasons.slice(0, 3),
      gaps: match.compromises.slice(0, 3),
    })),
    comparisons,
    nextQuestion: "Which matters more to you: listed price, mileage, equipment, or fuel economy? Verify requested equipment on both exact VINs before choosing.",
  };
}
