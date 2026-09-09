import type { Pool } from "pg";
import type { CrmOpportunity } from "./crm-core";
import type { ManagerHandoffEnvelope } from "./manager-handoff";

export type ManagerQueueItem = {
  protocol: "NORAUTO_MANAGER_QUEUE_ITEM_V1";
  truthState: "READ_MODEL_ONLY";
  authorityEffect: "NONE";
  opportunityId: string;
  pipeline: CrmOpportunity["pipeline"];
  stage: CrmOpportunity["stage"];
  deskState: "MANAGER_REVIEW_PENDING";
  customer: CrmOpportunity["customer"];
  buyingIntent: CrmOpportunity["buyingIntent"];
  inventoryEvidence: CrmOpportunity["inventoryEvidence"];
  attribution: CrmOpportunity["attribution"];
  managerHandoff: ManagerHandoffEnvelope;
  createdAt: string;
  updatedAt: string;
};

function requireWorkspaceId(workspaceId: string) {
  const normalized = workspaceId.trim();
  if (!normalized) throw new Error("Manager queue requires an explicit workspace boundary.");
  if (normalized.length > 128) throw new Error("Manager queue workspace identifier exceeds supported length.");
  return normalized;
}

export async function readPendingManagerQueue(input: {
  pool: Pool;
  workspaceId: string;
  limit?: number;
}): Promise<ManagerQueueItem[]> {
  const workspaceId = requireWorkspaceId(input.workspaceId);
  const limit = Math.max(1, Math.min(input.limit ?? 25, 100));

  const result = await input.pool.query<{
    opportunity_id: string;
    pipeline: CrmOpportunity["pipeline"];
    stage: CrmOpportunity["stage"];
    desk_state: "MANAGER_REVIEW_PENDING";
    customer: CrmOpportunity["customer"];
    buying_intent: CrmOpportunity["buyingIntent"];
    inventory_evidence: CrmOpportunity["inventoryEvidence"];
    attribution: CrmOpportunity["attribution"];
    created_at: Date;
    updated_at: Date;
    protocol: ManagerHandoffEnvelope["protocol"];
    handoff_id: string;
    handoff_idempotency_key: string;
    handoff_created_at: Date;
    workflow_state: ManagerHandoffEnvelope["workflowState"];
    desk_prep: ManagerHandoffEnvelope["deskPrep"];
    authority: ManagerHandoffEnvelope["authority"];
  }>(
    `SELECT
       o.opportunity_id,
       o.pipeline,
       o.stage,
       o.desk_state,
       o.customer,
       o.buying_intent,
       o.inventory_evidence,
       o.attribution,
       o.created_at,
       o.updated_at,
       h.protocol,
       h.handoff_id,
       h.handoff_idempotency_key,
       h.created_at AS handoff_created_at,
       h.workflow_state,
       h.desk_prep,
       h.authority
     FROM crm_opportunities o
     JOIN crm_manager_handoffs h
       ON h.workspace_id = o.workspace_id
      AND h.opportunity_id = o.opportunity_id
      AND h.handoff_id = o.latest_handoff_id
     WHERE o.workspace_id = $1
       AND o.desk_state = 'MANAGER_REVIEW_PENDING'
       AND o.stage NOT IN ('SOLD', 'LOST')
     ORDER BY o.created_at ASC, o.opportunity_id ASC
     LIMIT $2`,
    [workspaceId, limit],
  );

  return result.rows.map((row) => {
    if (row.workflow_state !== "MANAGER_REVIEW_PENDING") {
      throw new Error("Manager queue refused a handoff outside manager-review-pending state.");
    }
    if (row.authority.approveDeal !== "NOT_AUTHORIZED") {
      throw new Error("Manager queue refused a handoff that carries deal approval authority.");
    }

    return {
      protocol: "NORAUTO_MANAGER_QUEUE_ITEM_V1",
      truthState: "READ_MODEL_ONLY",
      authorityEffect: "NONE",
      opportunityId: row.opportunity_id,
      pipeline: row.pipeline,
      stage: row.stage,
      deskState: row.desk_state,
      customer: row.customer,
      buyingIntent: row.buying_intent,
      inventoryEvidence: row.inventory_evidence,
      attribution: row.attribution,
      managerHandoff: {
        protocol: row.protocol,
        handoffId: row.handoff_id,
        idempotencyKey: row.handoff_idempotency_key,
        createdAt: row.handoff_created_at.toISOString(),
        workflowState: row.workflow_state,
        deskPrep: row.desk_prep,
        authority: row.authority,
      },
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  });
}
