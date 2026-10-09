import {createHmac} from "node:crypto";
import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const previous=process.env.NORAUTO_PREVIOUS_SECRET;
const current=process.env.NORAUTO_CURRENT_SECRET;
if(!previous || !current) throw new Error("rotation secrets required");
const workspace="norautomatch";
const provider="NORAUTO_SITE_CHAT";
const conversation="round5-previous-secret-conversation";
const event="round5-previous-secret-event";
const rep="round5-previous-secret-rep";
const hash="9".repeat(64);
const material=["norautomatch:site-chat-publication:v1",workspace,conversation,hash].join("\u001f");
const proof=createHmac("sha256",previous).update(material,"utf8").digest("hex");
try {
  await pool.query(`
    insert into public.crm_conversation_events (
      workspace_id,provider,event_id,conversation_id,event_type,observed_at,
      normalized_payload,routing_decision,routing_reasons,processing_state
    ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),
      '{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')
  `,[workspace,provider,event,conversation]);
  await pool.query(`
    insert into public.crm_conversation_assignments (
      workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
    ) values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())
  `,[workspace,provider,conversation,rep]);
  await pool.query(`
    insert into public.crm_site_chat_access (
      workspace_id,conversation_id,access_token_hash,issuance_proof,publication_proof,created_at,expires_at
    ) values ($1,$2,$3,null,$4,clock_timestamp(),clock_timestamp()+interval '7 days')
  `,[workspace,conversation,hash,proof]);

  const c=await pool.connect();
  let accepted=false;
  try {
    await c.query("begin");
    await c.query("select set_config('norautomatch.site_chat_publication_hmac_secret',$1,true)",[current]);
    await c.query("select set_config('norautomatch.site_chat_publication_previous_hmac_secret',$1,true)",[previous]);
    await c.query(`
      insert into public.crm_site_chat_replies (
        workspace_id,conversation_id,source_event_id,body,published_by
      ) values ($1,$2,$3,'round5 previous-secret forged publication',$4)
    `,[workspace,conversation,event,rep]);
    await c.query("commit");
    accepted=true;
  } catch(e) {
    try { await c.query("rollback"); } catch {}
    if(/SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/.test(String(e))){
      console.log("PASS D4 Round5: previous publication secret cannot mint new access authority");
    } else throw e;
  } finally { c.release(); }

  if(accepted) throw new Error("NEW_FINDING_D4_PREVIOUS_SITECHAT_SECRET_CAN_MINT_NEW_PUBLICATION_AUTHORITY");
} finally { await pool.end(); }
