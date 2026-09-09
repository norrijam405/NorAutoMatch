import { createHash } from "node:crypto";
import type { ManagerDecision, ManagerHandoffEnvelope, WorkflowEvent } from "./manager-handoff";
import { managerDecisionTransition } from "./manager-handoff";

export type ManagerActorEvidence = {
  state: "VERIFIED" | "UNVERIFIED";
  subjectId: string;
  verifier: string;
  verifiedAt?: string;
  evidenceRef?: string;
};

export type ManagerReviewReceipt =
  | {
      protocol: "NORAUTO_MANAGER_REVIEW_RECEIPT_V1";
      status: "APPLIED";
      truthState: "VERIFIED_MANAGER_ACTION";
      receiptId: string;
      handoffId: string;
      idempotencyKey: string;
      decision: ManagerDecision;
      actor: ManagerActorEvidence & { state: "VERIFIED" };
      workflowEvent: WorkflowEvent;
      recordedAt: string;
      authority: {
        norAutoDealApproval: "NOT_GRANTED";
        managerActionScope: "HANDOFF_REVIEW_ONLY";
      };
    }
  | {
      protocol: "NORAUTO_MANAGER_REVIEW_RECEIPT_V1";
      status: "REJECTED";
      truthState: "UNVERIFIED_ACTOR";
      handoffId: string;
      decision: ManagerDecision;
      actor: ManagerActorEvidence;
      recordedAt: string;
      reason: "MANAGER_IDENTITY_NOT_VERIFIED";
      authority: {
        norAutoDealApproval: "NOT_GRANTED";
        managerActionScope: "NONE";
      };
    };

function receiptIdentity(input: {
  handoff: ManagerHandoffEnvelope;
  decision: ManagerDecision;
  actor: ManagerActorEvidence & { state: "VERIFIED" };
}) {
  return JSON.stringify({
    protocol: "NORAUTO_MANAGER_REVIEW_RECEIPT_V1",
    handoffId: input.handoff.handoffId,
    idempotencyKey: input.handoff.idempotencyKey,
    decision: input.decision,
    actorSubjectId: input.actor.subjectId,
    actorVerifier: input.actor.verifier,
    actorEvidenceRef: input.actor.evidenceRef ?? null,
  });
}

export function recordManagerReview(input: {
  handoff: ManagerHandoffEnvelope;
  decision: ManagerDecision;
  actor: ManagerActorEvidence;
  note?: string;
  recordedAt?: string;
}): ManagerReviewReceipt {
  const recordedAt = input.recordedAt ?? new Date().toISOString();

  if (input.actor.state !== "VERIFIED") {
    return {
      protocol: "NORAUTO_MANAGER_REVIEW_RECEIPT_V1",
      status: "REJECTED",
      truthState: "UNVERIFIED_ACTOR",
      handoffId: input.handoff.handoffId,
      decision: input.decision,
      actor: input.actor,
      recordedAt,
      reason: "MANAGER_IDENTITY_NOT_VERIFIED",
      authority: {
        norAutoDealApproval: "NOT_GRANTED",
        managerActionScope: "NONE",
      },
    };
  }

  const verifiedActor = input.actor as ManagerActorEvidence & { state: "VERIFIED" };
  const workflowEvent = managerDecisionTransition({
    current: input.handoff.workflowState,
    decision: input.decision,
    observedAt: recordedAt,
    note: input.note,
  });
  const identity = createHash("sha256")
    .update(receiptIdentity({ handoff: input.handoff, decision: input.decision, actor: verifiedActor }), "utf8")
    .digest("hex");

  return {
    protocol: "NORAUTO_MANAGER_REVIEW_RECEIPT_V1",
    status: "APPLIED",
    truthState: "VERIFIED_MANAGER_ACTION",
    receiptId: `namr_${identity.slice(0, 24)}`,
    handoffId: input.handoff.handoffId,
    idempotencyKey: identity,
    decision: input.decision,
    actor: verifiedActor,
    workflowEvent,
    recordedAt,
    authority: {
      norAutoDealApproval: "NOT_GRANTED",
      managerActionScope: "HANDOFF_REVIEW_ONLY",
    },
  };
}
