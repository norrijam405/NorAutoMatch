export const RESPONSE_EVIDENCE_CLAIM_PROTOCOL = "NORAUTO_RESPONSE_EVIDENCE_CLAIM_V1" as const;

export type ResponseEvidenceTopic = "AVAILABILITY" | "PRICE" | "INCENTIVES";

export type ResponseEvidenceClaim = {
  protocol: typeof RESPONSE_EVIDENCE_CLAIM_PROTOCOL;
  workspaceId: string;
  topic: ResponseEvidenceTopic;
  value: string;
  sourceType: "AUTHORIZED_INVENTORY" | "DEALERSHIP_MANAGER";
  sourceRef: string;
  observedAt: string;
  validUntil: string;
  evidenceState: "VERIFIED_CURRENT";
};

export type ResponseEvidenceValidation =
  | { valid: true; claim: ResponseEvidenceClaim }
  | { valid: false; reason: "INVALID_SHAPE" | "WORKSPACE_MISMATCH" | "INVALID_TIME" | "EXPIRED" | "TTL_TOO_LONG" };

const MAX_TTL_MS: Record<ResponseEvidenceTopic, number> = {
  AVAILABILITY: 15 * 60 * 1000,
  PRICE: 24 * 60 * 60 * 1000,
  INCENTIVES: 24 * 60 * 60 * 1000,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClaim(value: unknown): ResponseEvidenceClaim | null {
  if (!isRecord(value)) return null;
  const {
    protocol,
    workspaceId,
    topic,
    value: claimValue,
    sourceType,
    sourceRef,
    observedAt,
    validUntil,
    evidenceState,
  } = value;

  if (
    protocol !== RESPONSE_EVIDENCE_CLAIM_PROTOCOL ||
    typeof workspaceId !== "string" || !workspaceId.trim() || workspaceId.length > 120 ||
    !["AVAILABILITY", "PRICE", "INCENTIVES"].includes(String(topic)) ||
    typeof claimValue !== "string" || !claimValue.trim() || claimValue.length > 500 ||
    !["AUTHORIZED_INVENTORY", "DEALERSHIP_MANAGER"].includes(String(sourceType)) ||
    typeof sourceRef !== "string" || !sourceRef.trim() || sourceRef.length > 300 ||
    typeof observedAt !== "string" || observedAt.length > 80 ||
    typeof validUntil !== "string" || validUntil.length > 80 ||
    evidenceState !== "VERIFIED_CURRENT"
  ) {
    return null;
  }

  return {
    protocol,
    workspaceId,
    topic: topic as ResponseEvidenceTopic,
    value: claimValue,
    sourceType: sourceType as ResponseEvidenceClaim["sourceType"],
    sourceRef,
    observedAt,
    validUntil,
    evidenceState,
  };
}

export function validateResponseEvidenceClaim(input: {
  claim: unknown;
  expectedWorkspaceId: string;
  now?: Date;
}): ResponseEvidenceValidation {
  const claim = parseClaim(input.claim);
  if (!claim) return { valid: false, reason: "INVALID_SHAPE" };

  const now = input.now ?? new Date();
  if (claim.workspaceId !== input.expectedWorkspaceId) {
    return { valid: false, reason: "WORKSPACE_MISMATCH" };
  }

  const observedAt = Date.parse(claim.observedAt);
  const validUntil = Date.parse(claim.validUntil);
  if (!Number.isFinite(observedAt) || !Number.isFinite(validUntil) || validUntil < observedAt) {
    return { valid: false, reason: "INVALID_TIME" };
  }

  if (validUntil < now.getTime()) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (validUntil - observedAt > MAX_TTL_MS[claim.topic]) {
    return { valid: false, reason: "TTL_TOO_LONG" };
  }

  return { valid: true, claim };
}
