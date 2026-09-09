import { createHash } from "node:crypto";
import type { DeskPrepPacket } from "./desk-prep";

export type DealWorkflowState =
  | "LEAD_CAPTURED"
  | "INVENTORY_REVALIDATED"
  | "DESK_PREP_READY"
  | "MANAGER_REVIEW_PENDING"
  | "MANAGER_ACKNOWLEDGED"
  | "RETURNED_FOR_CLARIFICATION";

export type ManagerDecision = "ACKNOWLEDGED" | "RETURNED_FOR_CLARIFICATION";

export type WorkflowEvent = {
  from: DealWorkflowState;
  to: DealWorkflowState;
  actor: "NORAUTO_SYSTEM" | "MANAGER";
  observedAt: string;
  note?: string;
};

export type ManagerHandoffEnvelope = {
  protocol: "NORAUTO_MANAGER_HANDOFF_V1";
  handoffId: string;
  idempotencyKey: string;
  createdAt: string;
  workflowState: "MANAGER_REVIEW_PENDING";
  deskPrep: DeskPrepPacket;
  authority: {
    submitForReview: "AUTHORIZED";
    approveDeal: "NOT_AUTHORIZED";
    changePrice: "NOT_AUTHORIZED";
    approveFinancing: "NOT_AUTHORIZED";
    valueTrade: "NOT_AUTHORIZED";
  };
};

const systemTransitions = new Set([
  "LEAD_CAPTURED->INVENTORY_REVALIDATED",
  "INVENTORY_REVALIDATED->DESK_PREP_READY",
  "DESK_PREP_READY->MANAGER_REVIEW_PENDING",
]);

const managerTransitions = new Set([
  "MANAGER_REVIEW_PENDING->MANAGER_ACKNOWLEDGED",
  "MANAGER_REVIEW_PENDING->RETURNED_FOR_CLARIFICATION",
  "RETURNED_FOR_CLARIFICATION->MANAGER_REVIEW_PENDING",
]);

function stableDeskIdentity(packet: DeskPrepPacket) {
  return JSON.stringify({
    protocol: packet.protocol,
    pipeline: packet.pipeline,
    customer: packet.customer,
    buyingLane: packet.buyingLane,
    trade: packet.trade,
    vehicleEvidence: packet.vehicleEvidence,
    notes: packet.notes,
    authority: packet.authority,
    managerReviewRequired: packet.managerReviewRequired,
  });
}

export function createManagerHandoff(input: {
  deskPrep: DeskPrepPacket;
  createdAt?: string;
}): ManagerHandoffEnvelope {
  if (!input.deskPrep.managerReviewRequired || input.deskPrep.authority.dealApproval !== "MANAGER_REQUIRED") {
    throw new Error("Desk prep must preserve manager deal authority before handoff.");
  }

  const identity = createHash("sha256").update(stableDeskIdentity(input.deskPrep), "utf8").digest("hex");
  return {
    protocol: "NORAUTO_MANAGER_HANDOFF_V1",
    handoffId: `namh_${identity.slice(0, 24)}`,
    idempotencyKey: identity,
    createdAt: input.createdAt ?? new Date().toISOString(),
    workflowState: "MANAGER_REVIEW_PENDING",
    deskPrep: input.deskPrep,
    authority: {
      submitForReview: "AUTHORIZED",
      approveDeal: "NOT_AUTHORIZED",
      changePrice: "NOT_AUTHORIZED",
      approveFinancing: "NOT_AUTHORIZED",
      valueTrade: "NOT_AUTHORIZED",
    },
  };
}

export function advanceWorkflow(input: {
  from: DealWorkflowState;
  to: DealWorkflowState;
  actor: WorkflowEvent["actor"];
  observedAt?: string;
  note?: string;
}): WorkflowEvent {
  const transition = `${input.from}->${input.to}`;
  const allowed = input.actor === "MANAGER"
    ? managerTransitions.has(transition)
    : systemTransitions.has(transition);

  if (!allowed) {
    throw new Error(`Unauthorized workflow transition: ${input.actor} ${transition}`);
  }

  return {
    from: input.from,
    to: input.to,
    actor: input.actor,
    observedAt: input.observedAt ?? new Date().toISOString(),
    note: input.note,
  };
}

export function managerDecisionTransition(input: {
  current: DealWorkflowState;
  decision: ManagerDecision;
  observedAt?: string;
  note?: string;
}) {
  return advanceWorkflow({
    from: input.current,
    to: input.decision === "ACKNOWLEDGED" ? "MANAGER_ACKNOWLEDGED" : "RETURNED_FOR_CLARIFICATION",
    actor: "MANAGER",
    observedAt: input.observedAt,
    note: input.note,
  });
}
