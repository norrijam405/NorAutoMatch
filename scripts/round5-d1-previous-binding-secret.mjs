import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const previous=process.env.NORAUTO_PREVIOUS_SECRET;
if(!previous || previous.length<32) throw new Error("NORAUTO_PREVIOUS_SECRET required");
const workspace="norautomatch";
const opp="namo_"+"5".repeat(24);
const user="00000000-0000-4000-8000-000000005001";
try {
  await pool.query("delete from public.crm_opportunity_customer_bindings where opportunity_id=$1",[opp]).catch(()=>{});
  await pool.query("delete from public.crm_opportunities where opportunity_id=$1",[opp]);
  await pool.query(`
    insert into public.crm_opportunities (
      opportunity_id,workspace_id,intake_idempotency_key,pipeline,stage,desk_state,
      customer,buying_intent,inventory_evidence,attribution,latest_handoff_id,created_at,updated_at
    ) values ($1,$2,$3,'Standard Retail','NEW','MANAGER_REVIEW_PENDING',
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4,clock_timestamp(),clock_timestamp())
  `,[opp,workspace,"5".repeat(64),"namh_"+"5".repeat(24)]);

  const c=await pool.connect();
  let accepted=false;
  try {
    await c.query("begin");
    await c.query("select set_config('norautomatch.customer_binding_hmac_secret',$1,true)",[previous]);
    await c.query(`
      insert into public.crm_opportunity_customer_bindings
        (workspace_id,opportunity_id,customer_user_id,evidence_ref,authority)
      values ($1,$2,$3::uuid,'round5:previous-secret-new-binding','AUTHENTICATED_CUSTOMER')
    `,[workspace,opp,user]);
    await c.query("commit");
    accepted=true;
  } catch(e) {
    try { await c.query("rollback"); } catch {}
    if(/CUSTOMER_OPPORTUNITY_BINDING_AUTHENTICITY_REQUIRED/.test(String(e))){
      console.log("PASS D1 Round5: previous secret cannot mint new customer binding");
    } else throw e;
  } finally { c.release(); }

  if(accepted) throw new Error("NEW_FINDING_D1_PREVIOUS_SECRET_CAN_MINT_NEW_CUSTOMER_BINDING");
} finally { await pool.end(); }
