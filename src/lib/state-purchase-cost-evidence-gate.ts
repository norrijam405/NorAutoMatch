import { createHash } from "node:crypto";
import {
  evaluateStatePurchaseCost,
  type StatePurchaseCostInput,
  type StatePurchaseCostResult,
} from "./state-purchase-cost";

export type StateCostEvidenceClass =
  | "OFFICIAL_GOVERNMENT_SOURCE"
  | "DEAL_RECORD"
  | "DEALER_SOURCE";

export type StateCostEvidenceItem = {
  evidenceId: string;
  jurisdiction: string;
  evidenceClass: StateCostEvidenceClass;
  sourceUrl?: string;
  observedAt: string;
  note?: string;
};

export type StateCostEvidencePackage = {
  packageId: string;
  jurisdiction: string;
  ruleSources: string[];
  evidence: StateCostEvidenceItem[];
  calculationInput: StatePurchaseCostInput;
};

export type StateCostEvidenceGateResult = {
  protocol: "NORAUTOMATCH_STATE_COST_EVIDENCE_GATE_V1";
  valid: boolean;
  reasons: string[];
  authorityEffect: "NONE";
  evidenceDigestSha256: string;
  calculation?: StatePurchaseCostResult;
};

const OFFICIAL_RULE_SOURCES: Record<"OK" | "TX", readonly string[]> = {
  OK: [
    "https://oklahoma.gov/service/popular-services/readysettag.html",
    "https://oklahoma.gov/service/all-services/auto-vehicle/new-used-vehicle-registration.html",
    "https://oklahoma.gov/oumvdmhc/consumers/faq.html",
    "https://oklahoma.gov/service/all-services/auto-vehicle/fees.html",
  ],
  TX: [
    "https://comptroller.texas.gov/taxes/motor-vehicle/sales-use.php",
    "https://www.txdmv.gov/motorists/buying-or-selling-a-vehicle",
  ],
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function isIsoDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

export function verifyStateCostEvidencePackage(
  input: StateCostEvidencePackage,
): StateCostEvidenceGateResult {
  const reasons: string[] = [];
  const jurisdiction = input.jurisdiction.trim().toUpperCase();
  const calculationJurisdiction = input.calculationInput.jurisdiction.trim().toUpperCase();
  const evidenceDigestSha256 = digest(input);

  if (!input.packageId.trim()) reasons.push("PACKAGE_ID_REQUIRED");
  if (jurisdiction !== calculationJurisdiction) reasons.push("CALCULATION_JURISDICTION_MISMATCH");

  const supportedJurisdiction = jurisdiction === "OK" || jurisdiction === "TX";
  if (!supportedJurisdiction) reasons.push("JURISDICTION_NOT_VERIFIED");

  if (new Set(input.evidence.map((item) => item.evidenceId)).size !== input.evidence.length) {
    reasons.push("DUPLICATE_EVIDENCE_ID");
  }

  for (const item of input.evidence) {
    if (!item.evidenceId.trim()) reasons.push("EVIDENCE_ID_REQUIRED");
    if (item.jurisdiction.trim().toUpperCase() !== jurisdiction) reasons.push("EVIDENCE_JURISDICTION_MISMATCH");
    if (!isIsoDate(item.observedAt)) reasons.push("INVALID_EVIDENCE_OBSERVED_AT");
    if (item.evidenceClass === "OFFICIAL_GOVERNMENT_SOURCE" && !item.sourceUrl?.trim()) {
      reasons.push("OFFICIAL_SOURCE_URL_REQUIRED");
    }
  }

  if (supportedJurisdiction) {
    const allowed = OFFICIAL_RULE_SOURCES[jurisdiction as "OK" | "TX"];
    if (input.ruleSources.length === 0) reasons.push("OFFICIAL_RULE_SOURCE_REQUIRED");
    for (const source of input.ruleSources) {
      if (!allowed.includes(source)) reasons.push("UNRECOGNIZED_RULE_SOURCE");
    }
  }

  const evidenceById = new Map(input.evidence.map((item) => [item.evidenceId, item]));

  if (input.calculationInput.taxBasisProvenance) {
    const taxBasisEvidence = evidenceById.get(input.calculationInput.taxBasisProvenance);
    if (!taxBasisEvidence) {
      reasons.push("TAX_BASIS_PROVENANCE_UNRESOLVED");
    } else if (taxBasisEvidence.evidenceClass !== "DEAL_RECORD") {
      reasons.push("TAX_BASIS_REQUIRES_DEAL_RECORD");
    }
  }

  for (const charge of input.calculationInput.verifiedAdditionalGovernmentCharges ?? []) {
    const chargeEvidence = evidenceById.get(charge.provenance);
    if (!chargeEvidence) {
      reasons.push("GOVERNMENT_CHARGE_PROVENANCE_UNRESOLVED");
      continue;
    }
    if (chargeEvidence.evidenceClass !== "OFFICIAL_GOVERNMENT_SOURCE") {
      reasons.push("GOVERNMENT_CHARGE_REQUIRES_OFFICIAL_SOURCE");
    }
    if (chargeEvidence.sourceUrl && supportedJurisdiction) {
      const allowed = OFFICIAL_RULE_SOURCES[jurisdiction as "OK" | "TX"];
      if (!allowed.includes(chargeEvidence.sourceUrl)) reasons.push("GOVERNMENT_CHARGE_SOURCE_NOT_ALLOWLISTED");
    }
    if (charge.verifiedAt !== chargeEvidence.observedAt) {
      reasons.push("GOVERNMENT_CHARGE_VERIFICATION_TIME_MISMATCH");
    }
  }

  if (input.calculationInput.governmentChargesComplete) {
    const completenessId = input.calculationInput.governmentChargesCompletenessProvenance;
    const completenessEvidence = completenessId ? evidenceById.get(completenessId) : undefined;
    if (!completenessEvidence) {
      reasons.push("COMPLETENESS_PROVENANCE_UNRESOLVED");
    } else if (completenessEvidence.evidenceClass !== "OFFICIAL_GOVERNMENT_SOURCE") {
      reasons.push("COMPLETENESS_REQUIRES_OFFICIAL_SOURCE");
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length > 0) {
    return {
      protocol: "NORAUTOMATCH_STATE_COST_EVIDENCE_GATE_V1",
      valid: false,
      reasons: uniqueReasons,
      authorityEffect: "NONE",
      evidenceDigestSha256,
    };
  }

  return {
    protocol: "NORAUTOMATCH_STATE_COST_EVIDENCE_GATE_V1",
    valid: true,
    reasons: [],
    authorityEffect: "NONE",
    evidenceDigestSha256,
    calculation: evaluateStatePurchaseCost(input.calculationInput),
  };
}
