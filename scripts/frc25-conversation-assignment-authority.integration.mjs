import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const secret=process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET;
if(!secret || secret.length<32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");
const workspace="frc25-workspace";
const provider="NORAUTO_SITE_CHAT";
const conversation="frc25-conversation";
const event="frc25-event";
const legit="frc25-legit-rep";
const attacker="frc25-attacker";
try {
  await pool.query("delete from public.crm_conversation_contact_events where workspace_id=$1",[workspace]).catch(()=>{});
  await pool.query("delete from public.crm_conversation_events where workspace_id=$1",[workspace]).catch(()=>{});

  const seed=await pool.connect();
  try {
    await seed.query("begin");
    await seed.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);
    await seed.query(`insert into public.crm_conversation_assignments
      (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
      values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())`,
      [workspace,provider,conversation,legit]);
    await seed.query("commit");
  } catch(e) {
    try { await seed.query("rollback"); } catch {}
    throw e;
  } finally { seed.release(); }

  await pool.query(`insert into public.crm_conversation_events
    (workspace_id,provider,event_id,conversation_id,event_type,observed_at,normalized_payload,routing_decision,routing_reasons,processing_state)
    values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),
      $5::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
    [workspace,provider,event,conversation,JSON.stringify({customer:{communicationConsent:true,preferredContact:"EMAIL"}})]);

  let rewriteRejected=false;
  try {
    await pool.query(`update public.crm_conversation_assignments
      set assignee_subject_id=$1, updated_at=clock_timestamp()
      where workspace_id=$2 and provider=$3 and conversation_id=$4`,
      [attacker,workspace,provider,conversation]);
  } catch(e) {
    rewriteRejected=/CONVERSATION_ASSIGNMENT_AUTHENTICITY_REQUIRED/.test(String(e));
  }
  if(!rewriteRejected) throw new Error("FRC25_DIRECT_SQL_ASSIGNMENT_REWRITE_NOT_REJECTED");

  let forgedEvidenceRejected=false;
  try {
    await pool.query(`insert into public.crm_conversation_contact_events (
      client_action_id,workspace_id,provider,conversation_id,source_event_id,
      channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
    ) values (
      '00000000-0000-4000-8000-000000002501'::uuid,$1,$2,$3,$4,
      'EMAIL','OUTBOUND_EXECUTION_RECORDED',$5,$6,'***@example.com','HUMAN_REP','frc25-forged',null
    )`,[workspace,provider,conversation,event,attacker,"2".repeat(64)]);
  } catch(e) {
    forgedEvidenceRejected=/COMMUNICATION_CONVERSATION_OWNERSHIP_REQUIRED/.test(String(e));
  }
  if(!forgedEvidenceRejected) throw new Error("FRC25_FORGED_OWNER_CAN_MINT_COMMUNICATION_AUTHORITY");

  const governed=await pool.connect();
  try {
    await governed.query("begin");
    await governed.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);
    await governed.query(`update public.crm_conversation_assignments
      set assignee_subject_id=$1, updated_at=clock_timestamp()
      where workspace_id=$2 and provider=$3 and conversation_id=$4`,
      [attacker,workspace,provider,conversation]);
    await governed.query("rollback");
  } finally { governed.release(); }

  console.log("PASS FRC-25 direct SQL assignment rewrite rejected");
  console.log("PASS FRC-25 forged ownership cannot mint communication authority");
  console.log("PASS FRC-25 governed assignment mutation path remains available");
} finally { await pool.end(); }
