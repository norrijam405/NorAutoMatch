import pg from "pg";
import {createHmac} from "node:crypto";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspaceId="norautomatch";
const provider="NORAUTO_SITE_CHAT";
const conversationId="site-fresh-d5-function-shadow-0001";
const eventId="site-fresh-d5-function-shadow-0002";
const rep="fresh-d5-attacker";
const attackerSecret="fresh-function-shadow-secret-0123456789abcdef012345";
const accessHash="7".repeat(64);
const material=["norautomatch:site-chat-publication:v1",workspaceId,conversationId,accessHash].join("\u001f");
const forgedProof=createHmac("sha256",attackerSecret).update(material,"utf8").digest("hex");
try {
  await pool.query(`delete from public.crm_site_chat_replies where workspace_id=$1 and conversation_id=$2`,[workspaceId,conversationId]).catch(()=>{});
  await pool.query(`delete from public.crm_site_chat_access where workspace_id=$1 and conversation_id=$2`,[workspaceId,conversationId]).catch(()=>{});
  await pool.query(`delete from crm_conversation_assignments where workspace_id=$1 and provider=$2 and conversation_id=$3`,[workspaceId,provider,conversationId]).catch(()=>{});
  await pool.query(`delete from crm_conversation_events where workspace_id=$1 and provider=$2 and conversation_id=$3`,[workspaceId,provider,conversationId]).catch(()=>{});
  await pool.query(`insert into crm_conversation_events
   (workspace_id,provider,event_id,conversation_id,event_type,observed_at,normalized_payload,routing_decision,routing_reasons,processing_state)
   values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',current_timestamp,'{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
   [workspaceId,provider,eventId,conversationId]);
  await pool.query(`insert into crm_conversation_assignments
   (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
   values ($1,$2,$3,$4,'ASSIGNED',current_timestamp,current_timestamp)`,
   [workspaceId,provider,conversationId,rep]);

  const c=await pool.connect();
  let rejected=false;
  try {
    await c.query("begin");
    await c.query("create schema if not exists attacker_shadow");
    await c.query(`create or replace function attacker_shadow.norauto_site_chat_publication_secret_trusted(text)
      returns boolean language sql immutable as 'select true'`);
    await c.query(`create or replace function attacker_shadow.norauto_site_chat_publication_proof_valid(text,text,text,text,text,text)
      returns boolean language sql immutable as 'select true'`);
    await c.query("set local search_path = attacker_shadow, public");
    await c.query(`insert into public.crm_site_chat_access
      (workspace_id,conversation_id,access_token_hash,issuance_proof,publication_proof,created_at,expires_at)
      values ($1,$2,$3,null,$4,current_timestamp,clock_timestamp()+interval '7 days')`,
      [workspaceId,conversationId,accessHash,forgedProof]);
    await c.query("select set_config('norautomatch.site_chat_publication_hmac_secret',$1,true)",[attackerSecret]);
    await c.query(`insert into public.crm_site_chat_replies
      (workspace_id,conversation_id,source_event_id,body,published_by)
      values ($1,$2,$3,'fresh function-shadow forged publication',$4)`,
      [workspaceId,conversationId,eventId,rep]);
    await c.query("commit");
  } catch(e) {
    try { await c.query("rollback"); } catch {}
    rejected=/SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/.test(String(e));
  } finally { c.release(); }
  if(!rejected) throw new Error("NEW_FINDING_D5_FUNCTION_SEARCH_PATH_SHADOW_CAN_MINT_PUBLICATION_AUTHORITY");
  console.log("PASS D5 fresh variation: attacker-schema function shadow carries no publication authority");
} finally { await pool.end(); }
