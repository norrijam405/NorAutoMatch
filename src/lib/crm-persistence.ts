import type { CrmEvidenceRef, CrmOpportunity } from "./crm-core";
import type { CrmAtomicWrite, CrmOutboxEvent } from "./crm-outbox";
import type { ManagerHandoffEnvelope } from "./manager-handoff";
import type { ManagerReviewReceipt } from "./manager-review-receipt";

export const NORAUTO_WORKSPACE_ID = "norautomatch" as const;

export type PersistedOpportunityRow = {
  opportunityId: string;
  workspaceId: string;
  intakeIdempotencyKey: string;
  pipeline: CrmOpportunity["pipeline"];
  stage: CrmOpportunity["stage"];
  deskState: CrmOpportunity["deskState"];
  customer: CrmOpportunity["customer"];
  buyingIntent: CrmOpportunity["buyingIntent"];
  inventoryEvidence: CrmOpportunity["inventoryEvidence"];
  attribution: CrmOpportunity["attribution"];
  latestHandoffId: string;
  latestManagerReceiptId?: string;
  outcomeType?: "SOLD" | "LOST";
  outcomeEvidenceRef?: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistedEvidenceRow = CrmEvidenceRef & {
  workspaceId: string;
  opportunityId: string;
};

export type PersistedOutboxRow = {
  workspaceId: string;
  event: CrmOutboxEvent;
};

export type PersistedManagerHandoffRow = {
  workspaceId: string;
  opportunityId: string;
  handoff: ManagerHandoffEnvelope;
};

export type PersistedManagerReceiptRow = {
  workspaceId: string;
  opportunityId: string;
  receipt: Extract<ManagerReviewReceipt, { status: "APPLIED" }>;
};

export type CrmPersistencePlan = {
  protocol: "NORAUTO_CRM_PERSISTENCE_PLAN_V1";
  workspaceId: string;
  opportunity: PersistedOpportunityRow;
  evidence: PersistedEvidenceRow[];
  outbox: PersistedOutboxRow[];
  managerHandoffs: PersistedManagerHandoffRow[];
  managerReceipts: PersistedManagerReceiptRow[];
  transactionInvariant: "ALL_ROWS_COMMIT_TOGETHER_OR_NONE_COMMIT";
};

function requireWorkspaceId(workspaceId: string) {
  const normalized = workspaceId.trim();
  if (!normalized) throw new Error("CRM persistence requires an explicit workspace boundary.");
  if (normalized.length > 128) throw new Error("CRM workspace identifier exceeds supported length.");
  return normalized;
}

function mapOpportunity(workspaceId: string, opportunity: CrmOpportunity): PersistedOpportunityRow {
  if ((opportunity.stage === "SOLD" || opportunity.stage === "LOST") && !opportunity.outcome?.evidenceRef.ref) {
    throw new Error("Terminal CRM outcome cannot be persisted without outcome evidence.");
  }
  if (opportunity.stage !== "SOLD" && opportunity.stage !== "LOST" && opportunity.outcome) {
    throw new Error("Non-terminal CRM opportunity cannot persist a terminal outcome.");
  }

  return {
    opportunityId: opportunity.opportunityId,
    workspaceId,
    intakeIdempotencyKey: opportunity.intakeIdempotencyKey,
    pipeline: opportunity.pipeline,
    stage: opportunity.stage,
    deskState: opportunity.deskState,
    customer: opportunity.customer,
    buyingIntent: opportunity.buyingIntent,
    inventoryEvidence: opportunity.inventoryEvidence,
    attribution: opportunity.attribution,
    latestHandoffId: opportunity.latestHandoffId,
    latestManagerReceiptId: opportunity.latestManagerReceiptId,
    outcomeType: opportunity.outcome?.type,
    outcomeEvidenceRef: opportunity.outcome?.evidenceRef.ref,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
  };
}

export function buildCrmPersistencePlan(input: {
  atomicWrite: CrmAtomicWrite;
  workspaceId?: string;
  managerHandoff?: ManagerHandoffEnvelope;
  managerReceipts?: ManagerReviewReceipt[];
}): CrmPersistencePlan {
  if (input.atomicWrite.invariant !== "OPPORTUNITY_AND_OUTBOX_COMMIT_TOGETHER_OR_NOT_AT_ALL") {
    throw new Error("CRM persistence refused an atomic write without the required domain invariant.");
  }

  const workspaceId = requireWorkspaceId(input.workspaceId ?? NORAUTO_WORKSPACE_ID);
  const opportunity = input.atomicWrite.opportunity;
  const appliedReceipts = (input.managerReceipts ?? []).filter(
    (receipt): receipt is Extract<ManagerReviewReceipt, { status: "APPLIED" }> => receipt.status === "APPLIED",
  );

  if (input.managerHandoff && input.managerHandoff.handoffId !== opportunity.latestHandoffId) {
    throw new Error("Manager handoff cannot be persisted against an unrelated opportunity.");
  }
  if (input.managerHandoff && input.managerHandoff.deskPrep.pipeline !== opportunity.pipeline) {
    throw new Error("Manager handoff pipeline must match the CRM opportunity pipeline.");
  }

  if (opportunity.outcome) {
    const outcomeEvidencePresent = opportunity.evidence.some(
      (evidence) => evidence.ref === opportunity.outcome?.evidenceRef.ref && evidence.kind === opportunity.outcome?.evidenceRef.kind,
    );
    if (!outcomeEvidencePresent) {
      throw new Error("Terminal CRM outcome evidence must exist in the persisted evidence set.");
    }
  }

  for (const receipt of appliedReceipts) {
    if (receipt.handoffId !== opportunity.latestHandoffId) {
      throw new Error("Manager receipt cannot be persisted against an unrelated opportunity handoff.");
    }
  }

  return {
    protocol: "NORAUTO_CRM_PERSISTENCE_PLAN_V1",
    workspaceId,
    opportunity: mapOpportunity(workspaceId, opportunity),
    evidence: opportunity.evidence.map((evidence) => ({
      ...evidence,
      workspaceId,
      opportunityId: opportunity.opportunityId,
    })),
    outbox: input.atomicWrite.outbox.map((event) => ({ workspaceId, event })),
    managerHandoffs: input.managerHandoff
      ? [{ workspaceId, opportunityId: opportunity.opportunityId, handoff: input.managerHandoff }]
      : [],
    managerReceipts: appliedReceipts.map((receipt) => ({
      workspaceId,
      opportunityId: opportunity.opportunityId,
      receipt,
    })),
    transactionInvariant: "ALL_ROWS_COMMIT_TOGETHER_OR_NONE_COMMIT",
  };
}

export interface CrmPersistenceTransaction {
  insertOpportunity(row: PersistedOpportunityRow): Promise<"INSERTED" | "ALREADY_EXISTS_SAME_IDEMPOTENCY_KEY">;
  insertManagerHandoffs?: (rows: PersistedManagerHandoffRow[]) => Promise<void>;
  insertEvidence(rows: PersistedEvidenceRow[]): Promise<void>;
  insertManagerReceipts(rows: PersistedManagerReceiptRow[]): Promise<void>;
  insertOutbox(rows: PersistedOutboxRow[]): Promise<void>;
}

export interface CrmPersistenceAdapter {
  runAtomic<T>(operation: (transaction: CrmPersistenceTransaction) => Promise<T>): Promise<T>;
}

export async function executeCrmPersistencePlan(input: {
  adapter: CrmPersistenceAdapter;
  plan: CrmPersistencePlan;
}) {
  return input.adapter.runAtomic(async (transaction) => {
    const opportunityResult = await transaction.insertOpportunity(input.plan.opportunity);

    if (opportunityResult === "ALREADY_EXISTS_SAME_IDEMPOTENCY_KEY") {
      return {
        status: "DEDUPLICATED" as const,
        opportunityId: input.plan.opportunity.opportunityId,
        intakeIdempotencyKey: input.plan.opportunity.intakeIdempotencyKey,
      };
    }

    if (input.plan.managerHandoffs.length > 0) {
      if (!transaction.insertManagerHandoffs) {
        throw new Error("CRM adapter lacks required manager-handoff persistence capability.");
      }
      await transaction.insertManagerHandoffs(input.plan.managerHandoffs);
    }
    await transaction.insertEvidence(input.plan.evidence);
    await transaction.insertManagerReceipts(input.plan.managerReceipts);
    await transaction.insertOutbox(input.plan.outbox);

    return {
      status: "COMMITTED" as const,
      opportunityId: input.plan.opportunity.opportunityId,
      intakeIdempotencyKey: input.plan.opportunity.intakeIdempotencyKey,
      outboxEventIds: input.plan.outbox.map(({ event }) => event.eventId),
    };
  });
}
