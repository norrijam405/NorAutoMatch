/**
 * Media-to-shopping handoff. Only a public VIN is accepted; campaign text,
 * free-form query strings and personal identifiers are never forwarded.
 * MWMM remains the content owner; NAM performs vehicle research.
 */
export function mwmmVehicleResearchUrl(value: unknown): string {
  return typeof value === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(value)
    ? "/ask-torque?vin=" + value.toUpperCase()
    : "/ask-torque";
}
