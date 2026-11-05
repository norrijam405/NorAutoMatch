import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";

/** Clarify only missing information that changes what vehicles can honestly be recommended.
 * Never interpret a question as permission to relax a stated must-have.
 */
export function torqueNextQuestion(spec: TorqueSalesInventorySpec): string | null {
  // A VIN, a named model, or an explicit body style is enough to begin a bounded search.
  if (spec.vin || spec.stockNumber || spec.model || spec.bodyType) return null;
  const seats = spec.seatingCapacity?.value;
  if (seats && seats >= 6) {
    return `I heard that you need seats for ${seats}. Are you shopping for an SUV or open to a minivan as well? I won't assume a vehicle fits everyone without a verified seating configuration.`;
  }
  if (spec.fuelType?.value === "Electric") {
    return "Fully electric is noted. Would you prefer an SUV, sedan, or truck? I won't assume a body style.";
  }
  if (spec.make) {
    return `I have ${spec.make.value} as your requested make. Are you thinking SUV, sedan, truck, or a specific model?`;
  }
  if (spec.maxPrice) {
    return `I have your ceiling of $${spec.maxPrice.value.toLocaleString("en-US")}. What type of vehicle would work best: SUV, sedan, truck, or are you open?`;
  }
  if (spec.seatingCapacity) {
    return `You mentioned seating for ${spec.seatingCapacity.value}. What body style are you considering?`;
  }
  return null;
}
