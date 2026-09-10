import type { Pool } from "pg";
import type { CrmOpportunity } from "./crm-core";

export type AppointmentQueueItem = {
  protocol: "NORAUTO_APPOINTMENT_QUEUE_ITEM_V1";
  truthState: "READ_MODEL_ONLY";
  authorityEffect: "NONE";
  opportunityId: string;
  pipeline: CrmOpportunity["pipeline"];
  stage: "CONTACTED";
  customer: CrmOpportunity["customer"];
  buyingIntent: CrmOpportunity["buyingIntent"];
  attribution: CrmOpportunity["attribution"];
  updatedAt: string;
};

export async function readAppointmentConfirmationQueue(input: {
  pool: Pool;
  workspaceId: string;
  limit?: number;
}): Promise<AppointmentQueueItem[]> {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId || workspaceId.length > 128) throw new Error("Appointment queue requires a valid workspace boundary.");
  const limit = Math.max(1, Math.min(input.limit ?? 50, 100));

  const result = await input.pool.query<{
    opportunity_id: string;
    pipeline: CrmOpportunity["pipeline"];
    stage: "CONTACTED";
    customer: CrmOpportunity["customer"];
    buying_intent: CrmOpportunity["buyingIntent"];
    attribution: CrmOpportunity["attribution"];
    updated_at: Date;
  }>(
    `SELECT opportunity_id, pipeline, stage, customer, buying_intent, attribution, updated_at
       FROM crm_opportunities
      WHERE workspace_id = $1
        AND stage = 'CONTACTED'
      ORDER BY updated_at ASC, opportunity_id ASC
      LIMIT $2`,
    [workspaceId, limit],
  );

  return result.rows.map((row) => ({
    protocol: "NORAUTO_APPOINTMENT_QUEUE_ITEM_V1",
    truthState: "READ_MODEL_ONLY",
    authorityEffect: "NONE",
    opportunityId: row.opportunity_id,
    pipeline: row.pipeline,
    stage: "CONTACTED",
    customer: row.customer,
    buyingIntent: row.buying_intent,
    attribution: row.attribution,
    updatedAt: row.updated_at.toISOString(),
  }));
}
