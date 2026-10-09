import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const secret=process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
const suffix=(process.env.NORAUTO_FRC22_SUFFIX ?? "a").toLowerCase().replace(/[^a-f0-9]/g,"").slice(0,1) || "a";
if(secret.length<32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");
const workspace="norautomatch";
const opp="namo_"+suffix.repeat(24);
const user=`00000000-0000-4000-8000-00000000f22${suffix}`;
try {
  await pool.query(`
    insert into public.crm_opportunities (
      opportunity_id,workspace_id,intake_idempotency_key,pipeline,stage,desk_state,
      customer,buying_intent,inventory_evidence,attribution,latest_handoff_id,created_at,updated_at
    ) values ($1,$2,$3,'Standard Retail','NEW','MANAGER_REVIEW_PENDING',
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4,clock_timestamp(),clock_timestamp())
  `,[opp,workspace,suffix.repeat(64),"namh_"+suffix.repeat(24)]);

  const c=await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('norautomatch.customer_binding_hmac_secret',$1,true)",[secret]);
    await c.query(`
      insert into public.crm_opportunity_customer_bindings
        (workspace_id,opportunity_id,customer_user_id,evidence_ref,authority)
      values ($1,$2,$3::uuid,$4,'AUTHENTICATED_CUSTOMER')
    `,[workspace,opp,user,`frc22:rotation:${suffix}`]);
    await c.query("rollback");
  } finally { c.release(); }

  const count=await pool.query(
    "select count(*)::int as count from public.crm_opportunity_customer_bindings where workspace_id=$1 and opportunity_id=$2",
    [workspace,opp]
  );
  if(count.rows[0]?.count!==0) throw new Error("FRC22_ROLLED_BACK_BINDING_PERSISTED");
  console.log("PASS FRC-22 current governed secret authorizes fresh binding issuance after rotation");
} finally { await pool.end(); }
