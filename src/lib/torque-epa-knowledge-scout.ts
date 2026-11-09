/**
 * Torque Knowledge Scout: on-demand EPA fuel-economy lookup across all makes.
 *
 * Crucial distinction: FuelEconomy.gov records are YEAR / MAKE / MODEL /
 * POWERTRAIN CONFIGURATION estimates, never proof of a dealer VIN's equipment,
 * inventory availability, or a customer's realized MPG. Ambiguous options are
 * returned as alternatives, not silently mapped to the dealer unit.
 *
 * Read-only, fixed-host, bounded requests. No arbitrary URLs or user-supplied
 * network destinations; failures leave the primary inventory answer intact.
 */
export type EpaModelVariant = {
  label: string;
  cityMpg: number | null;
  highwayMpg: number | null;
  combinedMpg: number | null;
  sourceUrl: string;
};
export type TorqueEpaScoutReport = {
  source: "EPA_FUELECONOMY_GOV";
  status: "MODEL_VARIANTS" | "NOT_FOUND" | "UNAVAILABLE";
  year: number;
  make: string;
  model: string;
  checkedAt: string;
  variants: EpaModelVariant[];
  note: string;
};
const base = "https://www.fueleconomy.gov/ws/rest";
const cache = new Map<string, { expires: number; report: TorqueEpaScoutReport }>();
const CACHE_MS = 30 * 60 * 1000;
const boundedLabel = (v: string) => v.trim().slice(0, 60);
const mpg = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 200 ? n : null;
};
async function officialJson(path: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(base + path, {
      headers: { Accept: "application/json", "User-Agent": "NorAutoMatch-Torque-Scout/1.0 (read-only vehicle research)" },
      redirect: "error", cache: "no-store", signal: controller.signal,
    });
    if (!response.ok) throw new Error("EPA_HTTP_UNAVAILABLE");
    if (Number(response.headers.get("content-length") ?? 0) > 250000) throw new Error("EPA_TOO_LARGE");
    const raw = await response.text();
    if (raw.length > 250000) throw new Error("EPA_TOO_LARGE");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("EPA_INVALID_JSON");
    return parsed as Record<string, unknown>;
  } finally { clearTimeout(timer); }
}
const itemsFrom = (v: unknown): Array<{ text: string; value: string }> => {
  const arr = Array.isArray(v) ? v : v && typeof v === "object" ? [v] : [];
  return arr.filter((x): x is { text: string; value: string } =>
    !!x && typeof x === "object" && typeof x.text === "string" &&
    (typeof x.value === "string" || typeof x.value === "number"))
    .map(x => ({ text: boundedLabel(String(x.text)), value: String(x.value) }));
};
export async function scoutEpaModel(input: {year: number; make: string; model: string}): Promise<TorqueEpaScoutReport> {
  const year = input.year;
  const make = boundedLabel(input.make);
  const model = boundedLabel(input.model);
  const checkedAt = new Date().toISOString();
  const baseReport = {source: "EPA_FUELECONOMY_GOV" as const, year, make, model, checkedAt};
  const note = "EPA figures apply to a listed model/powertrain configuration, NOT automatically to a dealer VIN. Compare engine, drivetrain and transmission before claiming a match.";
  if (!Number.isInteger(year) || year < 1984 || year > new Date().getUTCFullYear() + 1 ||
      !/^[a-z0-9 .-]{2,60}$/i.test(make) || !/^[a-z0-9 .-]{1,60}$/i.test(model)) {
    return {...baseReport, status: "NOT_FOUND", variants: [], note: "A valid year, make and model are required."};
  }
  const key = JSON.stringify([year, make.toLowerCase(), model.toLowerCase()]);
  const prior = cache.get(key);
  if (prior && prior.expires > Date.now()) return prior.report;
  let report: TorqueEpaScoutReport;
  try {
    const options = await officialJson(
      "/vehicle/menu/options?year=" + year + "&make=" + encodeURIComponent(make) + "&model=" + encodeURIComponent(model));
    const list = itemsFrom(options.menuItem);
    const variants: EpaModelVariant[] = [];
    // Only inspect up to four clearly distinguished EPA configurations per
    // request, and state when the model has more unexamined options.
    for (const option of list.slice(0, 4)) {
      if (!/^\d{1,8}$/.test(option.value)) continue;
      const data = await officialJson("/vehicle/" + option.value);
      variants.push({
        label: option.text, cityMpg: mpg(data.city08), highwayMpg: mpg(data.highway08),
        combinedMpg: mpg(data.comb08),
        sourceUrl: "https://www.fueleconomy.gov/feg/noframes/" + option.value + ".shtml",
      });
    }
    report = {
      ...baseReport, status: variants.length ? "MODEL_VARIANTS" : "NOT_FOUND",
      variants, note: note + (list.length > 4 ? " Only the first four of " + list.length + " EPA configurations were inspected." : ""),
    };
  } catch {
    report = {...baseReport, status: "UNAVAILABLE", variants: [],
      note: "EPA research endpoint was unavailable or timed out. Dealer listing facts have not been changed."};
  }
  cache.set(key, { expires: Date.now() + (report.status === "UNAVAILABLE" ? 2 * 60 * 1000 : CACHE_MS), report });
  if (cache.size > 150) cache.delete(cache.keys().next().value!);
  return report;
}
