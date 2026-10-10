import pg from "pg";
const {Pool}=pg;
const url=process.env.NORAUTO_CRM_DATABASE_URL;
const secret=process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET;
if(!url) throw new Error("NORAUTO_CRM_DATABASE_URL required");
if(!secret || secret.length<32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");

const pool=new Pool({connectionString:url});
const workspace="frc3940-race";
const provider="NORAUTO_SITE_CHAT";
const conversation="frc3940-race-conversation";

try {
  await pool.query(`insert into public.crm_conversation_events
    (workspace_id,provider,event_id,conversation_id,event_type,observed_at,normalized_payload,routing_decision,routing_reasons,processing_state)
    values ($1,$2,'frc43-race-event',$3,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),'{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
    [workspace,provider,conversation]);

  const setup=await pool.connect();
  try {
    await setup.query("begin");
    await setup.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);
    await setup.query(`insert into public.crm_conversation_assignments
      (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
      values ($1,$2,$3,'rep-a','ASSIGNED',clock_timestamp(),clock_timestamp())`,
      [workspace,provider,conversation]);
    await setup.query("commit");
  } catch(e) {
    try { await setup.query("rollback"); } catch {}
    throw e;
  } finally {
    setup.release();
  }

  const a=await pool.connect();
  const b=await pool.connect();
  try {
    await a.query("begin");
    await b.query("begin");
    await a.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);
    await b.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);

    await a.query(`insert into public.crm_conversation_assignment_events
      (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
      values ($1,$2,$3,'CLAIMED','rep-a','rep-a')`,
      [workspace,provider,conversation]);

    const secondAttempt=b.query(`insert into public.crm_conversation_assignment_events
      (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
      values ($1,$2,$3,'CLAIMED','rep-a','rep-a')`,
      [workspace,provider,conversation])
      .then(()=>true)
      .catch(()=>false);

    await new Promise((resolve)=>setTimeout(resolve,250));
    await a.query("commit");

    const secondAccepted=await secondAttempt;
    if(secondAccepted){
      await b.query("commit");
      const count=await pool.query(
        `select count(*)::int as n from public.crm_conversation_assignment_events
          where workspace_id=$1 and provider=$2 and conversation_id=$3 and action='CLAIMED'`,
        [workspace,provider,conversation],
      );
      if(count.rows[0]?.n===2){
        throw new Error("FRC43_CONCURRENT_DUPLICATE_CLAIMED_EVIDENCE_ACCEPTED");
      }
      throw new Error("CONCURRENT_SECOND_INSERT_ACCEPTED_WITH_UNEXPECTED_COUNT");
    }

    await b.query("rollback");
    console.log("PASS FRC-43 concurrent duplicate CLAIMED attack rejected after serialized predecessor commit");
  } finally {
    a.release();
    b.release();
  }
} finally {
  await pool.end();
}
