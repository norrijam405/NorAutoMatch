import type { Pool } from "pg";

export async function requireVerifiedCustomerOpportunityBinding(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  customerUserId: string;
}) {
  if (input.workspaceId !== "norautomatch") {
    throw new Error("Secure-document opportunity binding refused a non-NorAutoMatch workspace.");
  }

  const result = await input.pool.query(
    `select 1
       from crm_opportunity_customer_bindings b
      where b.workspace_id = $1
        and b.opportunity_id = $2
        and b.customer_user_id = $3::uuid
      limit 1`,
    [input.workspaceId, input.opportunityId, input.customerUserId],
  );

  if (result.rowCount !== 1) {
    throw new Error("SECURE_DOCUMENT_OPPORTUNITY_CUSTOMER_MISMATCH");
  }
}
