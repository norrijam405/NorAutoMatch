import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const secret=process.env.NORAUTO_ROTATED_BINDING_SECRET;
if(!secret || secret.length<32) throw new Error("NORAUTO_ROTATED_BINDING_SECRET required");
const workspace="norautomatch";
const opp="namo_"+"e".repeat(24);
const user="00000000-0000-4000-8000-00000000d425";
try {
  await pool.query("delete from public.crm_opportunity_customer_bindings where opportunity_id=$1",[opp]).catch(()=>{});
  await pool.query("delete from public.crm_opportunities where opportunity_id=$1",[opp]);
  await pool.query(`
    insert into public.crm_opportunities (
      opportunity_id,workspace_id,intake_idempotency_key,pipeline,stage,desk_state,
      customer,buying_intent,inventory_evidence,attribution,latest_handoff_id,created_at,updated_at
    ) values ($1,$2,$3,'Standard Retail','NEW','MANAGER_REVIEW_PENDING',
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4,clock_timestamp(),clock_timestamp())
  `,[opp,workspace,"e".repeat(64),"namh_"+"e".repeat(24)]);
  const c=await pool.connect();
  let rejected=false;
  try {
    await c.query("begin");
    await c.query("select set_config('norautomatch.customer_binding_hmac_secret',$1,true)",[secret]);
    try {
      await c.query(`
        insert into public.crm_opportunity_customer_bindings
          (workspace_id,opportunity_id,customer_user_id,evidence_ref,authority)
        values ($1,$2,$3::uuid,'round4:legitimate-rotated-secret','AUTHENTICATED_CUSTOMER')
      `,[workspace,opp,user]);
    } catch(e) {
      rejected=/CUSTOMER_OPPORTUNITY_BINDING_AUTHENTICITY_REQUIRED/.test(String(e));
    }
    await c.query("rollback");
  } finally { c.release(); }
  if(rejected) throw new Error("NEW_FINDING_D5_GOVERNED_SECRET_ROTATION_BREAKS_BINDING_ISSUANCE");
  console.log("PASS D5 Round4: governed secret rotation preserves binding issuance");
} finally { await pool.end(); }
