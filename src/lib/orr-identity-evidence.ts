import type { OrrAlgoliaHit } from "./orr-public-algolia";

export type OrrIdentityEvidence = {
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  evidenceUrl: string;
  observedAt: string;
  basis: "VIN_SPECIFIC_ORR_VDP";
};

const evidenceByVin: Record<string, OrrIdentityEvidence> = {
  "3N8AP6CB1VL303920": {
    vin: "3N8AP6CB1VL303920",
    stockNumber: "VL303920",
    year: 2027,
    make: "Nissan",
    model: "Kicks",
    trim: "SV",
    evidenceUrl: "https://www.orrauto.com/auto/new-2027-nissan-kicks-sv-oklahoma-city-ok/124833759/",
    observedAt: "2026-09-16",
    basis: "VIN_SPECIFIC_ORR_VDP",
  },
};

function normalizedString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveOrrIdentityEvidence(hit: OrrAlgoliaHit): OrrIdentityEvidence | undefined {
  const vin = typeof hit.vin === "string" ? hit.vin.trim().toUpperCase() : "";
  const evidence = evidenceByVin[vin];
  if (!evidence) return undefined;

  const year = typeof hit.make_year === "number" ? hit.make_year : Number(hit.make_year);
  if (!Number.isFinite(year) || year !== evidence.year) return undefined;
  if (normalizedString(hit.stock_number) !== evidence.stockNumber.toLowerCase()) return undefined;
  if (normalizedString(hit.make) !== evidence.make.toLowerCase()) return undefined;
  if (normalizedString(hit.model) !== evidence.model.toLowerCase()) return undefined;

  return evidence;
}
