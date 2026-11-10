/** Human-initiated, read-only shopping brief. No raw chat or customer contact fields. */
export type PortableTorqueMatch = {
  id: string; label: string; price: number; fit: "exact"|"strong"|"near";
  compromises: string[];
};
export function buildPortableTorqueBrief(input: {
  requirements: string[];
  matches: PortableTorqueMatch[];
  mode: string | undefined;
}): string {
  const safeLine = (line: string) => line.replace(/[\r\n\t]/g," ").slice(0,110);
  const mode = input.mode === "verified-live" ? "dealer source checked" :
    input.mode === "verified-cache" ? "previously checked dealer cache" :
    "sample/unverified";
  const lines = [
    "NorAutoMatch — customer-reviewed shopping brief (not a submitted lead)",
    "Inventory evidence: " + mode,
    "Customer requirements: " + (input.requirements.slice(0,12).map(safeLine).join("; ") || "Not established"),
    "Shortlisted reference(s):",
  ];
  const candidates = input.mode === "verified-live" || input.mode === "verified-cache"
    ? input.matches.filter(match => /^[A-HJ-NPR-Z0-9]{17}$/i.test(match.id)).slice(0,3)
    : [];
  if (candidates.length === 0) lines.push("No verified VIN shortlisted; ask the dealership to search.");
  for (const car of candidates) {
    lines.push(
      "- " + safeLine(car.label) + " | VIN " + car.id.toUpperCase() +
      " | listed $" + (Number.isFinite(car.price) && car.price > 0 ? car.price.toLocaleString("en-US") : "unverified") +
      " | " + car.fit + " fit" +
      (car.compromises.length ? " | needs checking: " + car.compromises.slice(0,2).map(safeLine).join("; ") : "")
    );
  }
  lines.push("Next action: a salesperson must verify availability, features, mileage, price and any sourcing or transfer options.");
  lines.push("No hold, quote, appointment, financing decision or sourcing request has been sent.");
  return lines.join("\n");
}
