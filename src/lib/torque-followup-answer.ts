import type { Vehicle } from "./inventory";
import type { TorqueVehicleMatch } from "./torque-inventory-assistant";

/** Answers a customer's follow-up using the same VIN records already ranked for their
 * stated requirements. Never interpolates a missing MPG as a claimed value.
 */
export function scopedTorqueFollowup(
  message: string,
  matches: TorqueVehicleMatch[],
  inventory: Vehicle[],
  mode: "verified-live" | "verified-cache" | "representative-demo",
): string | null {
  const priceQuestion = /\b(?:prices?|costs?|budget|cheapest|afford(?:able)?|expensive)\b/i.test(message);
  const fuelQuestion = /\b(?:mpg|fuel econom|gas mileage|good on gas|fuel efficient)\b/i.test(message);
  if (!priceQuestion && !fuelQuestion) return null;
  if (!matches.length) return null;

  const byId = new Map(inventory.map(v => [v.id.toUpperCase(), v]));
  const candidates = matches.slice(0, 3).map(m => ({ match:m, vehicle:byId.get(m.id.toUpperCase()) }))
    .filter((x): x is { match: TorqueVehicleMatch; vehicle: Vehicle } => Boolean(x.vehicle));
  if (!candidates.length) return null;

  const scope = mode === "representative-demo"
    ? "These are examples from the demonstration catalog, not confirmed dealer stock."
    : mode === "verified-cache"
      ? "These numbers come from previously verified cached dealer records; confirm current listing and availability."
      : "These are dealer-source listing figures, not out-the-door quotes; verify current pricing and availability.";

  const lines = candidates.map(({ match,vehicle }) => {
    const label = [vehicle.year,vehicle.make,vehicle.model,vehicle.trim].filter(Boolean).join(" ");
    const price = priceQuestion && Number.isFinite(vehicle.price) && vehicle.price > 0
      ? `listed $${vehicle.price.toLocaleString("en-US")}` : null;
    const mpg = fuelQuestion
      ? typeof vehicle.cityMpg === "number" && typeof vehicle.highwayMpg === "number"
        ? `${vehicle.cityMpg} city / ${vehicle.highwayMpg} highway MPG reported`
        : "city/highway MPG not verified in this record"
      : null;
    return `${label} (${match.fit} fit): ${[price,mpg].filter(Boolean).join("; ")}.`;
  });
  return lines.join("\n") + "\n" + scope;
}
