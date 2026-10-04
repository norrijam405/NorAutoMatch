import { createHash } from "node:crypto";
import type { ResponseEvidencePassport } from "./evidence-passport";

export const COST_RECEIPT_PROTOCOL = "IGNIAQUA_COST_RECEIPT_V1" as const;

export type CostTruthState = "PARTIAL_MEASURED" | "MEASURED" | "ESTIMATED" | "UNKNOWN";

export type CostReceipt = {
  protocol: typeof COST_RECEIPT_PROTOCOL;
  receiptId: string;
  workspaceId: string;
  missionClass: ResponseEvidencePassport["missionClass"];
  relatedEvidencePassportId: string;
  executionPath: "DETERMINISTIC_APPLICATION_CODE";
  usage: {
    externalModelInvocationCount: 0;
    externalModelDirectCostUsd: 0;
    paidExternalToolInvocationCount: 0;
    paidExternalToolDirectCostUsd: 0;
  };
  unknownCostCategories: Array<"HOSTING_ALLOCATION" | "DATABASE_ALLOCATION" | "NETWORK_ALLOCATION" | "HUMAN_REVIEW_ALLOCATION">;
  totals: {
    knownDirectExternalCostUsd: 0;
    totalCostUsd: null;
  };
  measurement: {
    truthState: "PARTIAL_MEASURED";
    zeroTotalCostClaimed: false;
    reason: string;
  };
  outcome: {
    truthState: ResponseEvidencePassport["truthState"];
    deliveryState: ResponseEvidencePassport["execution"]["deliveryState"];
    customerReachedState: ResponseEvidencePassport["execution"]["customerReachedState"];
    terminalOutcomeAuthority: ResponseEvidencePassport["authority"]["terminalOutcomeAuthority"];
  };
  integrity: {
    evidencePassportDigestSha256: string;
    costReceiptDigestSha256: string;
  };
  authorityEffect: "NONE";
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function createResponsePreparationCostReceipt(input: {
  passport: ResponseEvidencePassport;
}): CostReceipt {
  const { passport } = input;

  if (passport.authority.humanReviewRequired !== true) {
    throw new Error("Cost Receipt refused an Evidence Passport outside the bounded human-review path.");
  }

  const core = {
    protocol: COST_RECEIPT_PROTOCOL,
    workspaceId: passport.workspaceId,
    missionClass: passport.missionClass,
    relatedEvidencePassportId: passport.passportId,
    executionPath: "DETERMINISTIC_APPLICATION_CODE" as const,
    usage: {
      externalModelInvocationCount: 0 as const,
      externalModelDirectCostUsd: 0 as const,
      paidExternalToolInvocationCount: 0 as const,
      paidExternalToolDirectCostUsd: 0 as const,
    },
    unknownCostCategories: [
      "HOSTING_ALLOCATION",
      "DATABASE_ALLOCATION",
      "NETWORK_ALLOCATION",
      "HUMAN_REVIEW_ALLOCATION",
    ] as CostReceipt["unknownCostCategories"],
    totals: {
      knownDirectExternalCostUsd: 0 as const,
      totalCostUsd: null,
    },
    measurement: {
      truthState: "PARTIAL_MEASURED" as const,
      zeroTotalCostClaimed: false as const,
      reason: "This scoped response-preparation path performs no external model or paid-tool invocation, but shared infrastructure and human-review allocations are not yet measured; therefore total cost is unknown and must not be represented as $0.",
    },
    outcome: {
      truthState: passport.truthState,
      deliveryState: passport.execution.deliveryState,
      customerReachedState: passport.execution.customerReachedState,
      terminalOutcomeAuthority: passport.authority.terminalOutcomeAuthority,
    },
    integrity: {
      evidencePassportDigestSha256: passport.integrity.passportDigestSha256,
    },
    authorityEffect: "NONE" as const,
  };

  const costReceiptDigestSha256 = sha256(core);
  return {
    ...core,
    receiptId: `icr_${costReceiptDigestSha256.slice(0, 24)}`,
    integrity: {
      ...core.integrity,
      costReceiptDigestSha256,
    },
  };
}
