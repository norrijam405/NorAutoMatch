import { createHash } from "node:crypto";
import type { ResponsePreparationPacket } from "./conversation-response-preparation";
import type { EnrichedResponseDraft } from "./conversation-response-enrichment";
import type { ResponseEvidencePassport } from "./evidence-passport";

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

export type ResponseEvidencePassportVerification = {
  protocol: "IGNIAQUA_EVIDENCE_PASSPORT_VERIFICATION_V1";
  valid: boolean;
  reasons: string[];
  authorityEffect: "NONE";
};

export function verifyResponseEvidencePassport(input: {
  packet: ResponsePreparationPacket;
  draft: EnrichedResponseDraft;
  passport: ResponseEvidencePassport;
}): ResponseEvidencePassportVerification {
  const reasons: string[] = [];
  const { packet, draft, passport } = input;

  if (packet.workspaceId !== passport.workspaceId || draft.workspaceId !== passport.workspaceId) {
    reasons.push("WORKSPACE_MISMATCH");
  }
  if (packet.eventId !== passport.subject.eventId || draft.eventId !== passport.subject.eventId) {
    reasons.push("EVENT_IDENTITY_MISMATCH");
  }
  if (packet.conversationId !== passport.subject.conversationId || draft.conversationId !== passport.subject.conversationId) {
    reasons.push("CONVERSATION_IDENTITY_MISMATCH");
  }
  if (sha256(packet) !== passport.integrity.preparationDigestSha256) {
    reasons.push("PREPARATION_DIGEST_MISMATCH");
  }
  if (sha256(draft) !== passport.integrity.draftDigestSha256) {
    reasons.push("DRAFT_DIGEST_MISMATCH");
  }

  const { passportId: _passportId, integrity, ...withoutIdAndIntegrity } = passport;
  const passportCore = {
    ...withoutIdAndIntegrity,
    integrity: {
      preparationDigestSha256: integrity.preparationDigestSha256,
      draftDigestSha256: integrity.draftDigestSha256,
    },
  };
  const passportDigest = sha256(passportCore);
  if (passportDigest !== passport.integrity.passportDigestSha256) {
    reasons.push("PASSPORT_DIGEST_MISMATCH");
  }
  if (`iepp_${passportDigest.slice(0, 24)}` !== passport.passportId) {
    reasons.push("PASSPORT_ID_MISMATCH");
  }

  return {
    protocol: "IGNIAQUA_EVIDENCE_PASSPORT_VERIFICATION_V1",
    valid: reasons.length === 0,
    reasons,
    authorityEffect: "NONE",
  };
}
