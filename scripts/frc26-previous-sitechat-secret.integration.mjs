import { createHmac } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.NORAUTO_CRM_DATABASE_URL });
const previous = process.env.NORAUTO_PREVIOUS_SECRET;
const current = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET;
if (!previous || previous.length < 32) throw new Error("NORAUTO_PREVIOUS_SECRET required");
if (!current || current.length < 32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");

const workspace="norautomatch";
const provider="NORAUTO_SITE_CHAT";
const conversation="frc26-conversation";
const event="frc26-event";
const rep="frc26-rep";
const previousHash="6".repeat(64);
const currentHash="8".repeat(64);
const previousMaterial=["norautomatch:site-chat-publication:v1",workspace,conversation,previousHash].join("\u001f");
const currentMaterial=["norautomatch:site-chat-publication:v1",workspace,conversation,currentHash].join("\u001f");
const previousProof=createHmac("sha256",previous).update(previousMaterial,"utf8").digest("hex");
const currentProof=createHmac("sha256",current).update(currentMaterial,"utf8").digest("hex");

async function seedConversation() {
  await pool.query("delete from public.crm_site_chat_replies where workspace_id=$1 and conversation_id=$2",[workspace,conversation]).catch(()=>{});
  await pool.query("delete from public.crm_site_chat_access where workspace_id=$1 and conversation_id=$2",[workspace,conversation]).catch(()=>{});
  await pool.query("delete from public.crm_conversation_assignments where workspace_id=$1 and provider=$2 and conversation_id=$3",[workspace,provider,conversation]).catch(()=>{});
  await pool.query("delete from public.crm_conversation_events where workspace_id=$1 and provider=$2 and conversation_id=$3",[workspace,provider,conversation]).catch(()=>{});

  await pool.query(`insert into public.crm_conversation_events
    (workspace_id,provider,event_id,conversation_id,event_type,observed_at,normalized_payload,routing_decision,routing_reasons,processing_state)
    values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),'{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
    [workspace,provider,event,conversation]);
  await pool.query(`insert into public.crm_conversation_assignments
    (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
    values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())`,
    [workspace,provider,conversation,rep]);
}

async function attemptPublication(secret, tokenHash, proof, body) {
  await pool.query(`insert into public.crm_site_chat_access
    (workspace_id,conversation_id,access_token_hash,issuance_proof,publication_proof,created_at,expires_at)
    values ($1,$2,$3,null,$4,clock_timestamp(),clock_timestamp()+interval '7 days')`,
    [workspace,conversation,tokenHash,proof]);

  const c=await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('norautomatch.site_chat_publication_hmac_secret',$1,true)",[secret]);
    await c.query("select set_config('norautomatch.site_chat_publication_previous_hmac_secret','',true)");
    await c.query(`insert into public.crm_site_chat_replies
      (workspace_id,conversation_id,source_event_id,body,published_by)
      values ($1,$2,$3,$4,$5)`,
      [workspace,conversation,event,body,rep]);
    await c.query("commit");
    return true;
  } catch(e) {
    try { await c.query("rollback"); } catch {}
    if(/SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED/.test(String(e))) return false;
    throw e;
  } finally { c.release(); }
}

try {
  await seedConversation();

  const oldAccepted=await attemptPublication(previous,previousHash,previousProof,"frc26 previous-secret publication");
  if(oldAccepted) throw new Error("FRC26_PREVIOUS_SECRET_STILL_MINTS_NEW_PUBLICATION_AUTHORITY");

  const currentAccepted=await attemptPublication(current,currentHash,currentProof,"frc26 current-secret publication");
  if(!currentAccepted) throw new Error("FRC26_CURRENT_SECRET_CANNOT_PUBLISH");

  console.log("PASS FRC-26 previous secret cannot mint new publication authority");
  console.log("PASS FRC-26 current secret preserves legitimate publication authority");
} finally {
  await pool.end();
}
