import { createHmac } from "node:crypto";
import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const previous=process.env.NORAUTO_PREVIOUS_SECRET;
if(!previous || previous.length<32) throw new Error("NORAUTO_PREVIOUS_SECRET required");
const workspace="norautomatch";
const provider="NORAUTO_SITE_CHAT";
const conversation="frc26-fresh-shadow";
const event="frc26-fresh-shadow-event";
const rep="frc26-fresh-rep";
const hash="9".repeat(64);
const proof=createHmac("sha256",previous)
  .update(["norautomatch:site-chat-publication:v1",workspace,conversation,hash].join("\u001f"),"utf8")
  .digest("hex");

try {
  await pool.query(`insert into public.crm_conversation_events
    (workspace_id,provider,event_id,conversation_id,event_type,observed_at,normalized_payload,routing_decision,routing_reasons,processing_state)
    values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),'{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
    [workspace,provider,event,conversation]);
  await pool.query(`insert into public.crm_conversation_assignments
    (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
    values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())`,
    [workspace,provider,conversation,rep]);
  await pool.query(`insert into public.crm_site_chat_access
    (workspace_id,conversation_id,access_token_hash,issuance_proof,publication_proof,created_at,expires_at)
    values ($1,$2,$3,null,$4,clock_timestamp(),clock_timestamp()+interval '7 days')`,
    [workspace,conversation,hash,proof]);

  const c=await pool.connect();
  let accepted=false;
  try {
    await c.query("begin");
    await c.query("create schema if not exists attacker_shadow");
    await c.query(`create or replace function attacker_shadow.norauto_site_chat_publication_secret_trusted(text)
      returns boolean language sql immutable as 'select true'`);
    await c.query("set local search_path=attacker_shadow,public");
    await c.query("select set_config('norautomatch.site_chat_publication_hmac_secret',$1,true)",[previous]);
    await c.query("select set_config('norautomatch.site_chat_publication_previous_hmac_secret','',true)");
    await c.query(`insert into public.crm_site_chat_replies
      (workspace_id,conversation_id,source_event_id,body,published_by)
      values ($1,$2,$3,'frc26 fresh shadow publication',$4)`,
      [workspace,conversation,event,rep]);
    await c.query("commit");
    accepted=true;
  } catch(e) {
    try { await c.query("rollback"); } catch {}
    if(!/SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/.test(String(e))) throw e;
  } finally { c.release(); }

  if(accepted) throw new Error("FRC26_FUNCTION_SHADOW_RESTORES_PREVIOUS_SECRET_AUTHORITY");
  console.log("PASS FRC-26 fresh function-shadow variant rejected");
} finally {
  await pool.end();
}
