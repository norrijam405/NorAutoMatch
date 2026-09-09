import type { LeadInventoryEvidence } from "./lead-inventory-evidence";
import type { LeadPayload } from "./lead-schema";
import type { ManagerHandoffEnvelope } from "./manager-handoff";
import { createCrmOpportunity } from "./crm-core";
import { createOpportunityAtomicWrite } from "./crm-outbox";
import {
  buildCrmPersistencePlan,
  executeCrmPersistencePlan,
  type CrmPersistenceAdapter,
} from "./crm-persistence";

export type CrmLeadIntakeResult = {
  opportunityId: string;
  intakeIdempotencyKey: string;
  persistenceStatus: "COMMITTED" | "DEDUPLICATED";
  pipeline: LeadPayload["pipeline"];
  stage: "NEW";
  deskState: "MANAGER_REVIEW_PENDING";
};

export async function persistLeadAsCrmOpportunity(input: {
  lead: LeadPayload;
  inventoryEvidence: LeadInventoryEvidence;
  managerHandoff: ManagerHandoffEnvelope;
  submittedAt: string;
  adapter: CrmPersistenceAdapter;
  workspaceId?: string;
}): Promise<CrmLeadIntakeResult> {
  const opportunity = createCrmOpportunity({
    lead: input.lead,
    inventoryEvidence: input.inventoryEvidence,
    handoff: input.managerHandoff,
    submittedAt: input.submittedAt,
  });

  const atomicWrite = createOpportunityAtomicWrite({
    opportunity,
    occurredAt: input.submittedAt,
  });

  const plan = buildCrmPersistencePlan({
    atomicWrite,
    workspaceId: input.workspaceId,
  });

  const result = await executeCrmPersistencePlan({
    adapter: input.adapter,
    plan,
  });

  return {
    opportunityId: opportunity.opportunityId,
    intakeIdempotencyKey: opportunity.intakeIdempotencyKey,
    persistenceStatus: result.status,
    pipeline: opportunity.pipeline,
    stage: "NEW",
    deskState: "MANAGER_REVIEW_PENDING",
  };
}
