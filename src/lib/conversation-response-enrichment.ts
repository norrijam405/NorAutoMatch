import type { ResponsePreparationPacket } from "./conversation-response-preparation";
import { createResponseDraft, type ResponseDraft } from "./conversation-response-draft";
import {
  validateResponseEvidenceClaim,
  type ResponseEvidenceClaim,
  type ResponseEvidenceTopic,
} from "./response-evidence-claim";

export const RESPONSE_ENRICHMENT_PROTOCOL = "NORAUTO_RESPONSE_ENRICHMENT_V1" as const;

export type EnrichedResponseDraft = ResponseDraft & {
  protocol: typeof RESPONSE_ENRICHMENT_PROTOCOL;
  evidenceUsed: Array<{
    topic: ResponseEvidenceTopic;
    value: string;
    sourceType: ResponseEvidenceClaim["sourceType"];
    sourceRef: string;
    observedAt: string;
    validUntil: string;
  }>;
  rejectedEvidence: Array<{
    topic: ResponseEvidenceTopic;
    reason: string;
  }>;
  mutableFactState: "PARTIALLY_VERIFIED" | "VERIFIED_AVAILABLE_FACTS" | "NO_VALID_CURRENT_EVIDENCE";
  authorityEffect: "DRAFT_WITH_EVIDENCE_ONLY";
};

const placeholderFor: Record<ResponseEvidenceTopic, string> = {
  AVAILABILITY: "[VERIFY_AVAILABILITY]",
  PRICE: "[VERIFY_PRICE]",
  INCENTIVES: "[VERIFY_INCENTIVES]",
};

const labelFor: Record<ResponseEvidenceTopic, string> = {
  AVAILABILITY: "Current availability",
  PRICE: "Current price",
  INCENTIVES: "Current incentive information",
};

export function createEnrichedResponseDraft(input: {
  packet: ResponsePreparationPacket;
  claims: ResponseEvidenceClaim[];
  now?: Date;
}): EnrichedResponseDraft {
  const base = createResponseDraft(input.packet);
  const evidenceUsed: EnrichedResponseDraft["evidenceUsed"] = [];
  const rejectedEvidence: EnrichedResponseDraft["rejectedEvidence"] = [];
  const acceptedByTopic = new Map<ResponseEvidenceTopic, ResponseEvidenceClaim>();

  for (const claim of input.claims) {
    const result = validateResponseEvidenceClaim({
      claim,
      expectedWorkspaceId: input.packet.workspaceId,
      now: input.now,
    });
    if (!result.valid) {
      rejectedEvidence.push({ topic: claim.topic, reason: result.reason });
      continue;
    }

    const existing = acceptedByTopic.get(claim.topic);
    if (!existing || Date.parse(claim.observedAt) > Date.parse(existing.observedAt)) {
      acceptedByTopic.set(claim.topic, claim);
    }
  }

  let text = base.text;
  let unresolvedEvidence = [...base.unresolvedEvidence];

  for (const [topic, claim] of acceptedByTopic.entries()) {
    const placeholder = placeholderFor[topic];
    if (!text.includes(placeholder)) continue;

    text = text.replace(placeholder, `${labelFor[topic]}: ${claim.value}`);
    unresolvedEvidence = unresolvedEvidence.filter((item) => item !== placeholder);
    evidenceUsed.push({
      topic,
      value: claim.value,
      sourceType: claim.sourceType,
      sourceRef: claim.sourceRef,
      observedAt: claim.observedAt,
      validUntil: claim.validUntil,
    });
  }

  const mutableTopics: ResponseEvidenceTopic[] = ["AVAILABILITY", "PRICE", "INCENTIVES"];
  const remainingMutable = mutableTopics.filter((topic) => unresolvedEvidence.includes(placeholderFor[topic]));
  const mutableFactState = evidenceUsed.length === 0
    ? "NO_VALID_CURRENT_EVIDENCE"
    : remainingMutable.length === 0
      ? "VERIFIED_AVAILABLE_FACTS"
      : "PARTIALLY_VERIFIED";

  return {
    ...base,
    protocol: RESPONSE_ENRICHMENT_PROTOCOL,
    text,
    unresolvedEvidence,
    evidenceUsed,
    rejectedEvidence,
    mutableFactState,
    authorityEffect: "DRAFT_WITH_EVIDENCE_ONLY",
  };
}
