import type { Pool } from "pg";
import type { CrmOpportunity } from "./crm-core";

export type CrmFollowUpObligationType = "FIRST_CONTACT" | "FOLLOW_UP";

export type PersistedFollowUpObligationRow = {
  workspaceId: string;
  opportunityId: string;
  obligationType: CrmFollowUpObligationType;
  dueAt: string;
};

export type FollowUpUrgency = "OVERDUE" | "DUE_SOON" | "UPCOMING";

export type FollowUpQueueItem = {
  opportunityId: string;
  pipeline: CrmOpportunity["pipeline"];
  stage: CrmOpportunity["stage"];
  obligationType: CrmFollowUpObligationType;
  dueAt: string;
  urgency: FollowUpUrgency;
  customer: CrmOpportunity["customer"];
  attribution: CrmOpportunity["attribution"];
  authorityEffect: "NONE";
};

export const DEFAULT_FIRST_CONTACT_SLA_MINUTES = 15;

export function createFirstContactObligation(input: {
  workspaceId: string;
  opportunity: CrmOpportunity;
  slaMinutes?: number;
}): PersistedFollowUpObligationRow {
  const slaMinutes = input.slaMinutes ?? DEFAULT_FIRST_CONTACT_SLA_MINUTES;
  if (!Number.isInteger(slaMinutes) || slaMinutes < 1 || slaMinutes > 24 * 60) {
    throw new Error("First-contact SLA must be an integer between 1 and 1440 minutes.");
  }
  if (input.opportunity.stage !== "NEW") {
    throw new Error("First-contact obligation may only be created for a newly captured opportunity.");
  }

  const createdAt = new Date(input.opportunity.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error("Opportunity creation time is invalid.");

  return {
    workspaceId: input.workspaceId,
    opportunityId: input.opportunity.opportunityId,
    obligationType: "FIRST_CONTACT",
    dueAt: new Date(createdAt.getTime() + slaMinutes * 60_000).toISOString(),
  };
}

export async function readFollowUpQueue(input: {
  pool: Pool;
  workspaceId: string;
  now?: string;
  limit?: number;
}): Promise<FollowUpQueueItem[]> {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("Follow-up queue requires an explicit workspace boundary.");
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const now = input.now ? new Date(input.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Follow-up queue requires a valid observation time.");

  const result = await input.pool.query<{
    opportunity_id: string;
    pipeline: CrmOpportunity["pipeline"];
    stage: CrmOpportunity["stage"];
    obligation_type: CrmFollowUpObligationType;
    due_at: Date;
    customer: CrmOpportunity["customer"];
    attribution: CrmOpportunity["attribution"];
  }>(
    `SELECT o.opportunity_id, o.pipeline, o.stage, f.obligation_type, f.due_at,
            o.customer, o.attribution
       FROM crm_follow_up_obligations f
       JOIN crm_opportunities o
         ON o.workspace_id = f.workspace_id
        AND o.opportunity_id = f.opportunity_id
      WHERE f.workspace_id = $1
        AND f.satisfied_at IS NULL
        AND o.stage NOT IN ('CONTACTED', 'APPOINTMENT_SET', 'SOLD', 'LOST')
        AND NOT EXISTS (
          SELECT 1
            FROM crm_data_lifecycle l
           WHERE l.workspace_id = o.workspace_id
             AND l.opportunity_id = o.opportunity_id
             AND l.state IN ('PRIMARY_REDACTED_BACKUP_PENDING', 'PRIMARY_REDACTED_BACKUP_EXPIRED')
        )
      ORDER BY f.due_at ASC, o.created_at ASC, o.opportunity_id ASC
      LIMIT $2`,
    [workspaceId, limit],
  );

  const nowMs = now.getTime();
  return result.rows.map((row) => {
    const dueMs = row.due_at.getTime();
    const urgency: FollowUpUrgency = dueMs <= nowMs
      ? "OVERDUE"
      : dueMs - nowMs <= 5 * 60_000
        ? "DUE_SOON"
        : "UPCOMING";
    return {
      opportunityId: row.opportunity_id,
      pipeline: row.pipeline,
      stage: row.stage,
      obligationType: row.obligation_type,
      dueAt: row.due_at.toISOString(),
      urgency,
      customer: row.customer,
      attribution: row.attribution,
      authorityEffect: "NONE",
    };
  });
}
