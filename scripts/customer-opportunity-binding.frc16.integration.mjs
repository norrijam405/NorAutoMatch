import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
const serverSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");
if (!serverSecret || serverSecret.trim().length < 32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");

const pool = new Pool({ connectionString });
const workspaceId = "norautomatch";
const customerUserId = "00000000-0000-4000-8000-00000000f016";
const opportunityId = "namo_" + "6".repeat(24);
const documentId = "00000000-0000-4000-8000-00000000d016";

async function insertBinding(client, evidenceRef) {
  return client.query(
    `insert into crm_opportunity_customer_bindings (
      workspace_id, opportunity_id, customer_user_id, evidence_ref, authority
    ) values ($1,$2,$3::uuid,$4,'AUTHENTICATED_CUSTOMER')`,
    [workspaceId, opportunityId, customerUserId, evidenceRef],
  );
}

try {
  await pool.query("delete from customer_secure_documents where id=$1::uuid", [documentId]);
  await pool.query("delete from crm_opportunity_customer_bindings where opportunity_id=$1", [opportunityId]).catch(() => {});
  await pool.query("delete from crm_opportunities where opportunity_id=$1", [opportunityId]);

  await pool.query(
    `insert into crm_opportunities (
      opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
      customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
      created_at, updated_at
    ) values (
      $1,$2,$3,'Standard Retail','NEW','MANAGER_REVIEW_PENDING',
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4,clock_timestamp(),clock_timestamp()
    )`,
    [opportunityId, workspaceId, "6".repeat(64), "namh_" + "6".repeat(24)],
  );

  await pool.query(
    `insert into customer_secure_documents (
      id,user_id,opportunity_id,kind,status,received_at,raw_deleted_at
    ) values ($1::uuid,$2::uuid,null,'DRIVER_LICENSE','RECEIVED',clock_timestamp(),null)`,
    [documentId, customerUserId],
  );

  let directRejected = false;
  try {
    await insertBinding(pool, "attacker:direct-sql-self-asserted");
  } catch (error) {
    directRejected = /CUSTOMER_OPPORTUNITY_BINDING_AUTHENTICITY_REQUIRED/.test(String(error));
  }
  if (!directRejected) throw new Error("FRC16_DIRECT_SQL_BINDING_NOT_REJECTED");

  const forgedClient = await pool.connect();
  try {
    await forgedClient.query("begin");
    await forgedClient.query(
      "select set_config('norautomatch.customer_binding_hmac_secret', $1, true)",
      ["attacker-selected-secret-0123456789abcdef"],
    );
    let forgedRejected = false;
    try {
      await insertBinding(forgedClient, "attacker:forged-session-secret");
    } catch (error) {
      forgedRejected = /CUSTOMER_OPPORTUNITY_BINDING_AUTHENTICITY_REQUIRED/.test(String(error));
    }
    await forgedClient.query("rollback");
    if (!forgedRejected) throw new Error("FRC16_FORGED_SESSION_SECRET_NOT_REJECTED");
  } finally {
    forgedClient.release();
  }

  const trustedClient = await pool.connect();
  try {
    await trustedClient.query("begin");
    await trustedClient.query(
      "select set_config('norautomatch.customer_binding_hmac_secret', $1, true)",
      [serverSecret.trim()],
    );
    await insertBinding(trustedClient, "governed:authenticated-customer-binding");
    await trustedClient.query("commit");
  } catch (error) {
    try { await trustedClient.query("rollback"); } catch {}
    throw error;
  } finally {
    trustedClient.release();
  }

  await pool.query(
    "update customer_secure_documents set opportunity_id=$1 where id=$2::uuid",
    [opportunityId, documentId],
  );

  const row = await pool.query(
    "select opportunity_id from customer_secure_documents where id=$1::uuid",
    [documentId],
  );
  if (row.rows[0]?.opportunity_id !== opportunityId) {
    throw new Error("FRC16_LEGITIMATE_BINDING_DID_NOT_AUTHORIZE_DOCUMENT_LINK");
  }

  console.log("PASS FRC-16 direct SQL cannot self-assert customer/opportunity binding authority");
  console.log("PASS FRC-16 forged transaction-local binding secret carries no authority");
  console.log("PASS FRC-16 governed server secret preserves legitimate binding issuance");
} finally {
  await pool.end();
}
