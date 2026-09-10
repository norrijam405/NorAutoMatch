import type { ResponsePreparationPacket } from "./conversation-response-preparation";
import { createResponseDraft, type ResponseDraft } from "./conversation-response-draft";
import {
  validateResponseEvidenceClaim,
  type ResponseEvidenceClaim,
  type ResponseEvidenceTopic,
} from "./response-evidence-claim";

export const RESPONSE_ENRICHMENT_PROTOCOL = "NORAUTO_RESPONSE_ENRICHMENT_V1" as const;

export type EnrichedResponseDraft = Omit<ResponseDraft, "protocol" | "authorityEffect"> & {
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
    topic: ResponseEvidenceTopic | null;
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

function topicFromUnknown(value: unknown): ResponseEvidenceTopic | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const topic = (value as { topic?: unknown }).topic;
  return ["AVAILABILITY", "PRICE", "INCENTIVES"].includes(String(topic))
    ? topic as ResponseEvidenceTopic
    : null;
}

export function createEnrichedResponseDraft(input: {
  packet: ResponsePreparationPacket;
  claims: unknown[];
  now?: Date;
}): EnrichedResponseDraft {
  const base = createResponseDraft(input.packet);
  const evidenceUsed: EnrichedResponseDraft["evidenceUsed"] = [];
  const rejectedEvidence: EnrichedResponseDraft["rejectedEvidence"] = [];
  const acceptedByTopic = new Map<ResponseEvidenceTopic, ResponseEvidenceClaim>();

  for (const candidate of input.claims) {
    const result = validateResponseEvidenceClaim({
      claim: candidate,
      expectedWorkspaceId: input.packet.workspaceId,
      now: input.now,
    });
    if (!result.valid) {
      rejectedEvidence.push({ topic: topicFromUnknown(candidate), reason: result.reason });
      continue;
    }

    const claim = result.claim;
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
