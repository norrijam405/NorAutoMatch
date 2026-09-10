import { createHash } from "node:crypto";

export type CustomerCommitmentType = "CALLBACK" | "PERSONALIZED_VIDEO" | "QUOTE" | "DOCUMENT" | "OTHER";
export type CustomerCommitmentState = "PENDING" | "DUE" | "OVERDUE" | "SATISFIED";
export type CustomerCommitmentAuthority = "CUSTOMER" | "NORAUTO_SYSTEM" | "MANAGER" | "DEALERSHIP_SYSTEM";

export type CustomerCommitmentObligation = {
  protocol: "NORAUTO_CUSTOMER_COMMITMENT_V1";
  commitmentId: string;
  workspaceId: string;
  opportunityId: string;
  type: CustomerCommitmentType;
  summary: string;
  createdAt: string;
  dueAt: string;
  createdFromEvidenceRef: string;
  state: CustomerCommitmentState;
  completion?: {
    satisfiedAt: string;
    evidenceRef: string;
    authority: CustomerCommitmentAuthority;
  };
  authorityEffect: "NONE";
};

function iso(value: string, label: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid timestamp.`);
  return new Date(parsed).toISOString();
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function createCustomerCommitment(input: {
  workspaceId: string;
  opportunityId: string;
  type: CustomerCommitmentType;
  summary: string;
  createdAt: string;
  dueAt: string;
  createdFromEvidenceRef: string;
}): CustomerCommitmentObligation {
  const workspaceId = input.workspaceId.trim();
  const opportunityId = input.opportunityId.trim();
  const summary = input.summary.trim();
  const evidenceRef = input.createdFromEvidenceRef.trim();
  if (!workspaceId || !opportunityId) throw new Error("Customer commitment requires explicit workspace and opportunity identity.");
  if (!summary) throw new Error("Customer commitment summary is required.");
  if (!evidenceRef) throw new Error("Customer commitment requires creation evidence.");
  const createdAt = iso(input.createdAt, "createdAt");
  const dueAt = iso(input.dueAt, "dueAt");
  if (Date.parse(dueAt) < Date.parse(createdAt)) throw new Error("Customer commitment dueAt cannot precede createdAt.");
  const identity = hash({ workspaceId, opportunityId, type: input.type, summary, createdAt, dueAt, evidenceRef });
  return {
    protocol: "NORAUTO_CUSTOMER_COMMITMENT_V1",
    commitmentId: `nacc_${identity.slice(0, 24)}`,
    workspaceId,
    opportunityId,
    type: input.type,
    summary,
    createdAt,
    dueAt,
    createdFromEvidenceRef: evidenceRef,
    state: "PENDING",
    authorityEffect: "NONE",
  };
}

export function deriveCustomerCommitmentState(input: {
  obligation: CustomerCommitmentObligation;
  now: string;
}): CustomerCommitmentObligation {
  if (input.obligation.state === "SATISFIED") return input.obligation;
  const now = iso(input.now, "now");
  const nowMs = Date.parse(now);
  const dueMs = Date.parse(input.obligation.dueAt);
  const state: CustomerCommitmentState = nowMs > dueMs ? "OVERDUE" : nowMs === dueMs ? "DUE" : "PENDING";
  return { ...input.obligation, state };
}

export function satisfyCustomerCommitment(input: {
  obligation: CustomerCommitmentObligation;
  workspaceId: string;
  completedAt: string;
  completionEvidenceRef: string;
  authority: CustomerCommitmentAuthority;
  evidenceKind: "COMPLETION_CONFIRMED" | "ATTEMPT_ONLY" | "TASK_PREPARED";
}): CustomerCommitmentObligation {
  if (input.workspaceId !== input.obligation.workspaceId) throw new Error("Customer commitment completion refused cross-workspace binding.");
  if (input.evidenceKind !== "COMPLETION_CONFIRMED") throw new Error("Customer commitment satisfaction requires explicit completion evidence; attempt/preparation is insufficient.");
  const evidenceRef = input.completionEvidenceRef.trim();
  if (!evidenceRef) throw new Error("Customer commitment completion evidence reference is required.");
  const completedAt = iso(input.completedAt, "completedAt");
  if (Date.parse(completedAt) < Date.parse(input.obligation.createdAt)) throw new Error("Customer commitment completion cannot predate creation.");
  return {
    ...input.obligation,
    state: "SATISFIED",
    completion: {
      satisfiedAt: completedAt,
      evidenceRef,
      authority: input.authority,
    },
  };
}
