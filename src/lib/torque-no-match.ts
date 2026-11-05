import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";

/** A no-match is evidence about one checked source, not a dealership-group-wide absence.
 * Only include claims that were explicitly supplied by the customer.
 */
export function explainTorqueNoMatch(spec: TorqueSalesInventorySpec, mode: "verified-live" | "verified-cache" | "representative-demo"): string {
  const hard: string[] = [];
  if (spec.bodyTypeAlternatives?.priority === "MUST_HAVE") hard.push("SUV or minivan");
  else if (spec.bodyType?.priority === "MUST_HAVE") hard.push(spec.bodyType.value.toLowerCase());
  if (spec.make?.priority === "MUST_HAVE") hard.push(spec.make.value);
  if (spec.model?.priority === "MUST_HAVE") hard.push(spec.model.value);
  if (spec.fuelType?.priority === "MUST_HAVE") hard.push(spec.fuelType.value.toLowerCase() + " powertrain");
  if (spec.maxPrice?.priority === "MUST_HAVE") hard.push("price no higher than $" + spec.maxPrice.value.toLocaleString("en-US"));
  if (spec.seatingCapacity?.priority === "MUST_HAVE") hard.push("seating for " + spec.seatingCapacity.value);
  if (spec.drivetrain?.priority === "MUST_HAVE") hard.push(spec.drivetrain.value);
  const named = hard.length ? hard.join(", ") : "the details provided";
  if (mode === "representative-demo") {
    return "The sample catalog cannot establish whether a dealer has a vehicle meeting " + named +
      ". This is demonstration data, not a stock availability finding.";
  }
  const scope = mode === "verified-cache" ? "previously verified cached records" : "the checked dealer catalog";
  return "I couldn't verify a suitable match for " + named + " in " + scope +
    ". That does NOT establish that Orr Auto Group has none. I can prepare a sourcing request for a salesperson to verify the broader network. I won't quietly relax a must-have.";
}
