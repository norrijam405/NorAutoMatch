import { createHash } from "node:crypto";
import type { LeadInventoryEvidence } from "./lead-inventory-evidence";
import type { LeadPayload } from "./lead-schema";
import type { ManagerHandoffEnvelope } from "./manager-handoff";
import type { ManagerReviewReceipt } from "./manager-review-receipt";

export type CrmPipeline = LeadPayload["pipeline"];

export type CrmOpportunityStage =
  | "NEW"
  | "CONTACT_PENDING"
  | "CONTACTED"
  | "APPOINTMENT_SET"
  | "SOLD"
  | "LOST";

export type CrmDeskState =
  | "NOT_PREPARED"
  | "MANAGER_REVIEW_PENDING"
  | "MANAGER_ACKNOWLEDGED"
  | "RETURNED_FOR_CLARIFICATION";

export type CrmEvidenceRef = {
  kind:
    | "LEAD_SUBMISSION"
    | "CONTACT_ATTEMPT"
    | "CONTACT_CONFIRMED"
    | "APPOINTMENT_CONFIRMED"
    | "DEALERSHIP_SOLD_OUTCOME"
    | "LOST_OUTCOME";
  ref: string;
  observedAt: string;
  authority: "CUSTOMER" | "NORAUTO_SYSTEM" | "MANAGER" | "DEALERSHIP_SYSTEM";
};

export type CrmAttribution = {
  source: string;
  campaign?: string;
  medium?: string;
  content?: string;
  term?: string;
};

export type CrmOpportunity = {
  protocol: "NORAUTO_CRM_OPPORTUNITY_V1";
  opportunityId: string;
  intakeIdempotencyKey: string;
  pipeline: CrmPipeline;
  stage: CrmOpportunityStage;
  deskState: CrmDeskState;
  createdAt: string;
  updatedAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    consent: true;
  };
  buyingIntent: {
    budgetRange: string;
    paymentMethod: LeadPayload["paymentMethod"];
    monthlyTarget?: number;
    downPayment?: number;
    termMonths?: number;
    tradeIn?: string;
    notes: string;
  };
  inventoryEvidence: LeadInventoryEvidence;
  latestHandoffId: string;
  latestManagerReceiptId?: string;
  attribution: CrmAttribution;
  evidence: CrmEvidenceRef[];
  outcome?: {
    type: "SOLD" | "LOST";
    evidenceRef: CrmEvidenceRef;
  };
};

export type CrmMutationActor = "NORAUTO_SYSTEM" | "MANAGER" | "DEALERSHIP_SYSTEM";

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function createCrmOpportunity(input: {
  lead: LeadPayload;
  inventoryEvidence: LeadInventoryEvidence;
  handoff: ManagerHandoffEnvelope;
  submittedAt: string;
  attribution?: Partial<CrmAttribution>;
}): CrmOpportunity {
  if (input.handoff.deskPrep.pipeline !== input.lead.pipeline) {
    throw new Error("CRM intake pipeline must match the desk-prep handoff pipeline.");
  }

  const intakeIdentity = stableHash({
    protocol: "NORAUTO_CRM_OPPORTUNITY_V1",
    handoffId: input.handoff.handoffId,
    handoffKey: input.handoff.idempotencyKey,
    pipeline: input.lead.pipeline,
  });

  return {
    protocol: "NORAUTO_CRM_OPPORTUNITY_V1",
    opportunityId: `namo_${intakeIdentity.slice(0, 24)}`,
    intakeIdempotencyKey: intakeIdentity,
    pipeline: input.lead.pipeline,
    stage: "NEW",
    deskState: "MANAGER_REVIEW_PENDING",
    createdAt: input.submittedAt,
    updatedAt: input.submittedAt,
    customer: {
      firstName: input.lead.firstName,
      lastName: input.lead.lastName,
      email: input.lead.email,
      phone: input.lead.phone,
      consent: true,
    },
    buyingIntent: {
      budgetRange: input.lead.budgetRange,
      paymentMethod: input.lead.paymentMethod,
      monthlyTarget: input.lead.monthlyTarget,
      downPayment: input.lead.downPayment,
      termMonths: input.lead.termMonths,
      tradeIn: input.lead.tradeIn || undefined,
      notes: input.lead.notes,
    },
    inventoryEvidence: input.inventoryEvidence,
    latestHandoffId: input.handoff.handoffId,
    attribution: {
      source: input.attribution?.source ?? input.lead.source,
      campaign: input.attribution?.campaign,
      medium: input.attribution?.medium,
      content: input.attribution?.content,
      term: input.attribution?.term,
    },
    evidence: [
      {
        kind: "LEAD_SUBMISSION",
        ref: input.handoff.handoffId,
        observedAt: input.submittedAt,
        authority: "CUSTOMER",
      },
    ],
  };
}

const systemTransitions = new Set([
  "NEW->CONTACT_PENDING",
  "CONTACT_PENDING->LOST",
]);

const evidencedTransitions = new Map<string, CrmEvidenceRef["kind"]>([
  ["CONTACT_PENDING->CONTACTED", "CONTACT_CONFIRMED"],
  ["CONTACTED->APPOINTMENT_SET", "APPOINTMENT_CONFIRMED"],
  ["APPOINTMENT_SET->SOLD", "DEALERSHIP_SOLD_OUTCOME"],
  ["CONTACTED->LOST", "LOST_OUTCOME"],
  ["APPOINTMENT_SET->LOST", "LOST_OUTCOME"],
]);

export function advanceCrmOpportunity(input: {
  opportunity: CrmOpportunity;
  to: CrmOpportunityStage;
  actor: CrmMutationActor;
  evidence?: CrmEvidenceRef;
  observedAt?: string;
}): CrmOpportunity {
  const from = input.opportunity.stage;
  const transition = `${from}->${input.to}`;
  const requiredEvidence = evidencedTransitions.get(transition);

  if (requiredEvidence) {
    if (!input.evidence || input.evidence.kind !== requiredEvidence) {
      throw new Error(`CRM transition ${transition} requires ${requiredEvidence} evidence.`);
    }
    if (input.to === "SOLD" && input.evidence.authority !== "DEALERSHIP_SYSTEM" && input.evidence.authority !== "MANAGER") {
      throw new Error("Sold outcome requires manager or dealership-system authority.");
    }
    if (input.to === "CONTACTED" && input.evidence.authority === "NORAUTO_SYSTEM") {
      throw new Error("NorAutoMatch cannot manufacture confirmed customer contact.");
    }
  } else if (!systemTransitions.has(transition)) {
    throw new Error(`Unauthorized CRM transition: ${input.actor} ${transition}`);
  }

  if (input.to === "SOLD" && input.actor === "NORAUTO_SYSTEM") {
    throw new Error("NorAutoMatch cannot self-mark an opportunity sold.");
  }

  const observedAt = input.observedAt ?? input.evidence?.observedAt ?? new Date().toISOString();
  const evidence = input.evidence
    ? [...input.opportunity.evidence, input.evidence]
    : input.opportunity.evidence;

  return {
    ...input.opportunity,
    stage: input.to,
    updatedAt: observedAt,
    evidence,
    outcome: input.to === "SOLD" || input.to === "LOST"
      ? {
          type: input.to,
          evidenceRef: input.evidence ?? {
            kind: "LOST_OUTCOME",
            ref: `system-loss-${input.opportunity.opportunityId}`,
            observedAt,
            authority: "NORAUTO_SYSTEM",
          },
        }
      : input.opportunity.outcome,
  };
}

export function applyManagerReviewReceipt(input: {
  opportunity: CrmOpportunity;
  receipt: ManagerReviewReceipt;
}): CrmOpportunity {
  if (input.receipt.handoffId !== input.opportunity.latestHandoffId) {
    throw new Error("Manager receipt does not belong to the opportunity's latest handoff.");
  }
  if (input.receipt.status !== "APPLIED") {
    return input.opportunity;
  }

  return {
    ...input.opportunity,
    deskState: input.receipt.workflowEvent.to === "MANAGER_ACKNOWLEDGED"
      ? "MANAGER_ACKNOWLEDGED"
      : "RETURNED_FOR_CLARIFICATION",
    latestManagerReceiptId: input.receipt.receiptId,
    updatedAt: input.receipt.recordedAt,
  };
}

export function deriveFollowUpState(input: {
  opportunity: CrmOpportunity;
  now: string;
  firstContactDueMinutes?: number;
}) {
  const dueMinutes = input.firstContactDueMinutes ?? 15;
  const dueAtMs = Date.parse(input.opportunity.createdAt) + dueMinutes * 60_000;
  const nowMs = Date.parse(input.now);
  const pending = input.opportunity.stage === "NEW" || input.opportunity.stage === "CONTACT_PENDING";

  return {
    dueAt: new Date(dueAtMs).toISOString(),
    overdue: pending && nowMs > dueAtMs,
    satisfied: !pending,
    truthState: "DERIVED" as const,
  };
}

export function toAnalyticsAttribution(opportunity: CrmOpportunity) {
  return {
    opportunityId: opportunity.opportunityId,
    pipeline: opportunity.pipeline,
    stage: opportunity.stage,
    source: opportunity.attribution.source,
    campaign: opportunity.attribution.campaign,
    medium: opportunity.attribution.medium,
  };
}
