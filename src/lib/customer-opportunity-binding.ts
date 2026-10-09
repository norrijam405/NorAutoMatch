import type { Pool } from "pg";

export type CustomerOpportunityBindingAuthority =
  | "AUTHENTICATED_CUSTOMER"
  | "DEALERSHIP_SYSTEM";

export async function createVerifiedCustomerOpportunityBinding(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  customerUserId: string;
  evidenceRef: string;
  authority: CustomerOpportunityBindingAuthority;
  serverSecret: string;
}) {
  if (input.workspaceId !== "norautomatch") {
    throw new Error("Customer/opportunity binding refused a non-NorAutoMatch workspace.");
  }
  if (input.serverSecret.trim().length < 32) {
    throw new Error("CUSTOMER_BINDING_SERVER_SECRET_REQUIRED");
  }
  const evidenceRef = input.evidenceRef.trim();
  if (!evidenceRef || evidenceRef.length > 512) {
    throw new Error("CUSTOMER_BINDING_EVIDENCE_REF_INVALID");
  }

  const client = await input.pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('norautomatch.customer_binding_hmac_secret', $1, true)",
      [input.serverSecret.trim()],
    );
    await client.query(
      `insert into crm_opportunity_customer_bindings (
        workspace_id,
        opportunity_id,
        customer_user_id,
        evidence_ref,
        authority
      ) values ($1,$2,$3::uuid,$4,$5)`,
      [
        input.workspaceId,
        input.opportunityId,
        input.customerUserId,
        evidenceRef,
        input.authority,
      ],
    );
    await client.query("commit");
    return { status: "COMMITTED" as const };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

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
