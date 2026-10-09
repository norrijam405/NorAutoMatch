import pg from "pg";
const { Pool } = pg;

const cs = process.env.NORAUTO_CRM_DATABASE_URL;
if (!cs) throw new Error("NORAUTO_CRM_DATABASE_URL required");
const pool = new Pool({connectionString: cs});

const workspaceId = "norautomatch";
const userVictim = "00000000-0000-4000-8000-00000000fa01";
const oppTarget = "namo_freshd1_target000000001";
const docId = "00000000-0000-4000-8000-00000000fd01";

try {
  await pool.query("delete from customer_secure_documents where id=$1::uuid", [docId]);
  await pool.query("delete from crm_opportunity_customer_bindings where opportunity_id=$1", [oppTarget]).catch(()=>{});
  await pool.query("delete from crm_opportunities where opportunity_id=$1", [oppTarget]);

  await pool.query(
    `insert into crm_opportunities (
      opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
      customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
      created_at, updated_at
    ) values (
      $1,$2,$3,'Standard Retail','NEW','MANAGER_REVIEW_PENDING',
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4,clock_timestamp(),clock_timestamp()
    )`,
    [oppTarget, workspaceId, "f".repeat(64), "namh_"+"f".repeat(24)]
  );

  await pool.query(
    `insert into customer_secure_documents
      (id,user_id,opportunity_id,kind,status,received_at,raw_deleted_at)
     values ($1::uuid,$2::uuid,null,'DRIVER_LICENSE','RECEIVED',clock_timestamp(),null)`,
    [docId, userVictim]
  );

  let forgedBindingAccepted = false;
  try {
    await pool.query(
      `insert into crm_opportunity_customer_bindings
       (workspace_id, opportunity_id, customer_user_id, evidence_ref, authority)
       values ($1,$2,$3::uuid,'attacker:direct-sql-self-asserted','AUTHENTICATED_CUSTOMER')`,
      [workspaceId, oppTarget, userVictim]
    );
    forgedBindingAccepted = true;
  } catch (error) {
    console.log("PASS D1 fresh variation: forged direct-SQL customer binding rejected");
  }

  if (forgedBindingAccepted) {
    let documentLinkAccepted = false;
    try {
      await pool.query(
        "update customer_secure_documents set opportunity_id=$1 where id=$2::uuid",
        [oppTarget, docId]
      );
      documentLinkAccepted = true;
    } catch {}

    if (documentLinkAccepted) {
      throw new Error(
        "NEW_FINDING_D1_FORGED_BINDING_MINTS_CROSS_CUSTOMER_AUTHORITY: direct SQL can self-assert AUTHENTICATED_CUSTOMER binding and then authorize secure-document linkage"
      );
    }
    throw new Error(
      "NEW_FINDING_D1_FORGED_BINDING_ACCEPTED: direct SQL can self-assert AUTHENTICATED_CUSTOMER binding without independently verified evidence"
    );
  }
} finally {
  await pool.end();
}
