import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspace="round3-shadow";
const provider="NORAUTO_SITE_CHAT";
const conversation="round3-shadow-conversation";
const event="round3-shadow-event";
const actor="round3-shadow-attacker";
try {
  await pool.query("delete from public.crm_conversation_contact_events where workspace_id=$1",[workspace]).catch(()=>{});
  const c=await pool.connect();
  let inserted=false;
  try {
    await c.query("begin");
    await c.query(`create temporary table crm_conversation_events (
      workspace_id text, provider text, event_id text, conversation_id text,
      normalized_payload jsonb, processing_state text
    ) on commit drop`);
    await c.query(`create temporary table crm_conversation_assignments (
      workspace_id text, provider text, conversation_id text,
      assignment_state text, assignee_subject_id text
    ) on commit drop`);
    await c.query("set local search_path=pg_temp,public");
    await c.query(`insert into crm_conversation_events values
      ($1,$2,$3,$4,$5::jsonb,'RECEIVED')`,
      [workspace,provider,event,conversation,JSON.stringify({customer:{communicationConsent:true,preferredContact:"EMAIL"}})]);
    await c.query(`insert into crm_conversation_assignments values
      ($1,$2,$3,'ASSIGNED',$4)`,[workspace,provider,conversation,actor]);
    await c.query(`
      insert into public.crm_conversation_contact_events (
        client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,
        evidence_authority,evidence_ref,delivery_outcome
      ) values (
        '00000000-0000-4000-8000-00000000d303'::uuid,$1,$2,$3,$4,
        'EMAIL','OUTBOUND_EXECUTION_RECORDED',$5,$6,'***@example.com',
        'HUMAN_REP','round3:forged-execution',null
      )`,
      [workspace,provider,conversation,event,actor,"d".repeat(64)]);
    await c.query("commit");
    inserted=true;
  } catch(e) {
    try { await c.query("rollback"); } catch {}
    if(/COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE|COMMUNICATION_CONVERSATION_OWNERSHIP_REQUIRED/.test(String(e))){
      console.log("PASS D3 fresh variation: temp relation shadow rejected");
    } else throw e;
  } finally { c.release(); }
  if(inserted) throw new Error("NEW_FINDING_D3_TEMP_RELATION_SHADOW_MINTS_COMMUNICATION_EXECUTION_TRUTH");
} finally { await pool.end(); }
