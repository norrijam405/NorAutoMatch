import { createHash } from "node:crypto";
import type { CrmOpportunity } from "./crm-core";

export type CrmOutboxEventType =
  | "CRM_OPPORTUNITY_CREATED"
  | "CRM_OPPORTUNITY_STAGE_CHANGED"
  | "CRM_MANAGER_REVIEW_APPLIED"
  | "CRM_FOLLOW_UP_DUE"
  | "CRM_OUTCOME_RECORDED";

export type CrmOutboxEvent = {
  protocol: "NORAUTO_CRM_OUTBOX_V1";
  eventId: string;
  idempotencyKey: string;
  eventType: CrmOutboxEventType;
  aggregateType: "CRM_OPPORTUNITY";
  aggregateId: string;
  pipeline: CrmOpportunity["pipeline"];
  occurredAt: string;
  payload: Record<string, unknown>;
  delivery: {
    state: "PENDING";
    attempts: 0;
    maxAttempts: number;
  };
};

function stableEventIdentity(input: {
  eventType: CrmOutboxEventType;
  aggregateId: string;
  pipeline: CrmOpportunity["pipeline"];
  payload: Record<string, unknown>;
}) {
  return JSON.stringify({
    protocol: "NORAUTO_CRM_OUTBOX_V1",
    eventType: input.eventType,
    aggregateId: input.aggregateId,
    pipeline: input.pipeline,
    payload: input.payload,
  });
}

export function createCrmOutboxEvent(input: {
  opportunity: Pick<CrmOpportunity, "opportunityId" | "pipeline">;
  eventType: CrmOutboxEventType;
  occurredAt: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
}): CrmOutboxEvent {
  const identity = createHash("sha256")
    .update(stableEventIdentity({
      eventType: input.eventType,
      aggregateId: input.opportunity.opportunityId,
      pipeline: input.opportunity.pipeline,
      payload: input.payload,
    }), "utf8")
    .digest("hex");

  return {
    protocol: "NORAUTO_CRM_OUTBOX_V1",
    eventId: `name_${identity.slice(0, 24)}`,
    idempotencyKey: identity,
    eventType: input.eventType,
    aggregateType: "CRM_OPPORTUNITY",
    aggregateId: input.opportunity.opportunityId,
    pipeline: input.opportunity.pipeline,
    occurredAt: input.occurredAt,
    payload: input.payload,
    delivery: {
      state: "PENDING",
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 8,
    },
  };
}

export type CrmAtomicWrite = {
  protocol: "NORAUTO_CRM_ATOMIC_WRITE_V1";
  opportunity: CrmOpportunity;
  outbox: CrmOutboxEvent[];
  invariant: "OPPORTUNITY_AND_OUTBOX_COMMIT_TOGETHER_OR_NOT_AT_ALL";
};

export function createOpportunityAtomicWrite(input: {
  opportunity: CrmOpportunity;
  occurredAt?: string;
}): CrmAtomicWrite {
  const occurredAt = input.occurredAt ?? input.opportunity.createdAt;
  const event = createCrmOutboxEvent({
    opportunity: input.opportunity,
    eventType: "CRM_OPPORTUNITY_CREATED",
    occurredAt,
    payload: {
      opportunityId: input.opportunity.opportunityId,
      intakeIdempotencyKey: input.opportunity.intakeIdempotencyKey,
      pipeline: input.opportunity.pipeline,
      stage: input.opportunity.stage,
      deskState: input.opportunity.deskState,
      latestHandoffId: input.opportunity.latestHandoffId,
    },
  });

  return {
    protocol: "NORAUTO_CRM_ATOMIC_WRITE_V1",
    opportunity: input.opportunity,
    outbox: [event],
    invariant: "OPPORTUNITY_AND_OUTBOX_COMMIT_TOGETHER_OR_NOT_AT_ALL",
  };
}

export function crmOutboxConsumerKey(event: CrmOutboxEvent) {
  return `${event.protocol}:${event.idempotencyKey}`;
}
