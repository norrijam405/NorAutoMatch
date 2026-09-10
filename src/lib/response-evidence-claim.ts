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

export function validateResponseEvidenceClaim(input: {
  claim: ResponseEvidenceClaim;
  expectedWorkspaceId: string;
  now?: Date;
}): ResponseEvidenceValidation {
  const { claim, expectedWorkspaceId } = input;
  const now = input.now ?? new Date();

  if (
    claim.protocol !== RESPONSE_EVIDENCE_CLAIM_PROTOCOL ||
    !claim.workspaceId ||
    !claim.value.trim() ||
    claim.value.length > 500 ||
    !claim.sourceRef.trim() ||
    claim.sourceRef.length > 300 ||
    !["AUTHORIZED_INVENTORY", "DEALERSHIP_MANAGER"].includes(claim.sourceType) ||
    !["AVAILABILITY", "PRICE", "INCENTIVES"].includes(claim.topic) ||
    claim.evidenceState !== "VERIFIED_CURRENT"
  ) {
    return { valid: false, reason: "INVALID_SHAPE" };
  }

  if (claim.workspaceId !== expectedWorkspaceId) {
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
