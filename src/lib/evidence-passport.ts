import { createHash } from "node:crypto";
import type { ResponsePreparationPacket } from "./conversation-response-preparation";
import type { EnrichedResponseDraft } from "./conversation-response-enrichment";

export const EVIDENCE_PASSPORT_PROTOCOL = "IGNIAQUA_EVIDENCE_PASSPORT_V1" as const;

export type ResponseEvidencePassport = {
  protocol: typeof EVIDENCE_PASSPORT_PROTOCOL;
  passportId: string;
  workspaceId: string;
  missionClass: "CUSTOMER_RESPONSE_PREPARATION";
  subject: {
    provider: string;
    eventId: string;
    conversationId: string;
  };
  evidence: {
    sourceRefs: string[];
    acceptedMutableClaims: Array<{
      topic: string;
      sourceType: string;
      sourceRef: string;
      observedAt: string;
      validUntil: string;
    }>;
    rejectedClaimCount: number;
    unresolvedEvidence: string[];
    mutableFactState: EnrichedResponseDraft["mutableFactState"];
  };
  execution: {
    outboundExecution: "NOT_PERFORMED";
    deliveryState: "NOT_SENT";
    customerReachedState: "NOT_CLAIMED";
  };
  authority: {
    authorityEffect: "DRAFT_WITH_EVIDENCE_ONLY";
    humanReviewRequired: true;
    terminalOutcomeAuthority: "NONE";
  };
  integrity: {
    preparationDigestSha256: string;
    draftDigestSha256: string;
    passportDigestSha256: string;
  };
  truthState: "EVIDENCE_BOUND_DRAFT_ONLY";
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

export function createResponseEvidencePassport(input: {
  packet: ResponsePreparationPacket;
  draft: EnrichedResponseDraft;
}): ResponseEvidencePassport {
  const { packet, draft } = input;
  if (packet.workspaceId !== draft.workspaceId) {
    throw new Error("Evidence Passport refused cross-workspace packet/draft binding.");
  }
  if (packet.eventId !== draft.eventId || packet.conversationId !== draft.conversationId) {
    throw new Error("Evidence Passport refused mismatched conversation identity.");
  }
  if (draft.deliveryState !== "NOT_SENT" || draft.customerReachedState !== "NOT_CLAIMED" || !draft.requiresHumanReview) {
    throw new Error("Evidence Passport only supports bounded human-review response drafts.");
  }

  const preparationDigestSha256 = sha256(packet);
  const draftDigestSha256 = sha256(draft);
  const acceptedMutableClaims = draft.evidenceUsed.map((claim) => ({
    topic: claim.topic,
    sourceType: claim.sourceType,
    sourceRef: claim.sourceRef,
    observedAt: claim.observedAt,
    validUntil: claim.validUntil,
  }));

  const core = {
    protocol: EVIDENCE_PASSPORT_PROTOCOL,
    workspaceId: packet.workspaceId,
    missionClass: "CUSTOMER_RESPONSE_PREPARATION" as const,
    subject: {
      provider: packet.provider,
      eventId: packet.eventId,
      conversationId: packet.conversationId,
    },
    evidence: {
      sourceRefs: acceptedMutableClaims.map((item) => item.sourceRef),
      acceptedMutableClaims,
      rejectedClaimCount: draft.rejectedEvidence.length,
      unresolvedEvidence: [...draft.unresolvedEvidence],
      mutableFactState: draft.mutableFactState,
    },
    execution: {
      outboundExecution: "NOT_PERFORMED" as const,
      deliveryState: "NOT_SENT" as const,
      customerReachedState: "NOT_CLAIMED" as const,
    },
    authority: {
      authorityEffect: "DRAFT_WITH_EVIDENCE_ONLY" as const,
      humanReviewRequired: true as const,
      terminalOutcomeAuthority: "NONE" as const,
    },
    integrity: {
      preparationDigestSha256,
      draftDigestSha256,
    },
    truthState: "EVIDENCE_BOUND_DRAFT_ONLY" as const,
  };

  const passportDigestSha256 = sha256(core);
  return {
    ...core,
    passportId: `iepp_${passportDigestSha256.slice(0, 24)}`,
    integrity: {
      ...core.integrity,
      passportDigestSha256,
    },
  };
}
