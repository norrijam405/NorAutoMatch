/**
 * Parse a customer's explicit independent MPG question. This is model
 * research only, not proof of dealership inventory or a specific VIN.
 */
const MAKES = "Toyota|Honda|Nissan|Hyundai|Kia|Ford|Chevrolet|Mazda|Subaru|Jeep|Volkswagen|BMW|Lexus|Acura|GMC|Buick|Mitsubishi|Volvo";
const DIRECT = new RegExp(
  "\\b(?:epa\\s+)?(?:mpg|fuel\\s+economy|gas\\s+mileage)\\s*(?:for|of|on|:)?\\s*" +
  "(20\\d{2})\\s+(" + MAKES + ")\\s+([a-z0-9][a-z0-9-]{1,19})\\b", "i",
);
export type TorqueExplicitResearch = {year: number; make: string; model: string};
export function parseTorqueExplicitMpgResearch(message: string): TorqueExplicitResearch | null {
  const match = message.match(DIRECT);
  return match ? {year: Number(match[1]), make: match[2], model: match[3]} : null;
}
export function customerAskedAboutMpg(message: string): boolean {
  return /\b(?:mpg|gas mileage|good on gas|fuel econom(?:y|ical)?|fuel efficient|miles per gallon)\b/i.test(message);
}
