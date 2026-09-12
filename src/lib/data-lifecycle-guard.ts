import type { PoolClient } from "pg";

export const REDACTED_OPERATIONAL_STATES = [
  "PRIMARY_REDACTED_BACKUP_PENDING",
  "PRIMARY_REDACTED_BACKUP_EXPIRED",
] as const;

export async function assertOpportunityOperationallyActive(input: {
  client: PoolClient;
  workspaceId: string;
  opportunityId: string;
}) {
  const result = await input.client.query<{ state: string }>(
    `SELECT state
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2
      FOR SHARE`,
    [input.workspaceId, input.opportunityId],
  );
  const state = result.rows[0]?.state;
  if (state === "PRIMARY_REDACTED_BACKUP_PENDING" || state === "PRIMARY_REDACTED_BACKUP_EXPIRED") {
    throw new Error("DATA_LIFECYCLE_OPERATION_SUPPRESSED");
  }
}
