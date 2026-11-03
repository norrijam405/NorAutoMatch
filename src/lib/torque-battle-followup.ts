/** A bounded conversation interpreter for an already-selected Garage Battle pair.
 * No model calls, no stored private transcripts and no inference of hard requirements.
 */
export const BATTLE_PRIORITIES = {
  all: [],
  budget: ["advertised-price"],
  fuel: ["highway-mpg", "city-mpg"],
  space: ["cargo", "seating"],
  weather: ["traction"],
  city: ["footprint"]
} as const;
export type BattlePriority = keyof typeof BATTLE_PRIORITIES;
export const isBattlePriority = (value: unknown): value is BattlePriority =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(BATTLE_PRIORITIES, value);

/** Only explicit words in the current turn can change priority. */
export function resolveBattlePriority(message: string, previous: BattlePriority): BattlePriority {
  const text = message.toLowerCase();
  if (/\b(?:everything|all (?:the )?(?:facts|differences|categories)|overall|big picture)\b/.test(text)) return "all";
  if (/\b(?:gas mileage|fuel economy|mpg|fuel efficient|gas costs?)\b/.test(text)) return "fuel";
  if (/\b(?:cheaper|price|costs?|budget|afford|expensive)\b/.test(text)) return "budget";
  if (/\b(?:cargo|space|room|seats?|family|luggage|stroller)\b/.test(text)) return "space";
  if (/\b(?:snow|traction|awd|4wd|4x4|rain|off.road)\b/.test(text)) return "weather";
  if (/\b(?:parking|compact|length|city driving|easy to park)\b/.test(text)) return "city";
  return previous;
}

export function battleFollowupType(message: string): "choice" | "details" | "comparison" {
  if (/\b(?:which|choose|pick|recommend|best|better|would you|what should i|you prefer)\b/i.test(message)) return "choice";
  if (/\b(?:why|explain|how|tell me more|what about|details?)\b/i.test(message)) return "details";
  return "comparison";
}
