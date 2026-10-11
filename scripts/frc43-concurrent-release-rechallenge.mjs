import pg from "pg";
const {Pool}=pg;
const url=process.env.NORAUTO_CRM_DATABASE_URL;
const secret=process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET;
if(!url) throw new Error("NORAUTO_CRM_DATABASE_URL required");
if(!secret || secret.length<32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");
const pool=new Pool({connectionString:url});
const workspace="frc43-release-race";
const provider="NORAUTO_SITE_CHAT";
const conversation="frc43-release-race-conversation";
try {
  const setup=await pool.connect();
  try {
    await setup.query("begin");
    await setup.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);
    await setup.query(`insert into public.crm_conversation_assignments
      (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
      values ($1,$2,$3,'rep-a','ASSIGNED',clock_timestamp(),clock_timestamp())`,
      [workspace,provider,conversation]);
    await setup.query(`insert into public.crm_conversation_assignment_events
      (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
      values ($1,$2,$3,'CLAIMED','rep-a','rep-a')`,
      [workspace,provider,conversation]);
    await setup.query(`update public.crm_conversation_assignments
      set assignee_subject_id=null,assignment_state='UNASSIGNED',assigned_at=null,updated_at=clock_timestamp()
      where workspace_id=$1 and provider=$2 and conversation_id=$3`,
      [workspace,provider,conversation]);
    await setup.query("commit");
  } catch(e) {
    try { await setup.query("rollback"); } catch {}
    throw e;
  } finally { setup.release(); }

  const a=await pool.connect();
  const b=await pool.connect();
  try {
    await a.query("begin");
    await b.query("begin");
    await a.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);
    await b.query("select set_config('norautomatch.conversation_assignment_hmac_secret',$1,true)",[secret]);

    await a.query(`insert into public.crm_conversation_assignment_events
      (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
      values ($1,$2,$3,'RELEASED','rep-a',null)`,
      [workspace,provider,conversation]);

    const secondAttempt=b.query(`insert into public.crm_conversation_assignment_events
      (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
      values ($1,$2,$3,'RELEASED','rep-a',null)`,
      [workspace,provider,conversation])
      .then(()=>true).catch(()=>false);

    await new Promise((resolve)=>setTimeout(resolve,250));
    await a.query("commit");
    const secondAccepted=await secondAttempt;
    if(secondAccepted){
      await b.query("commit");
      const count=await pool.query(
        `select count(*)::int as n from public.crm_conversation_assignment_events
         where workspace_id=$1 and provider=$2 and conversation_id=$3 and action='RELEASED'`,
        [workspace,provider,conversation]);
      if(count.rows[0]?.n===2) throw new Error("NEW_FINDING_FRC43_CONCURRENT_DUPLICATE_RELEASED_EVIDENCE_ACCEPTED");
      throw new Error("SECOND_RELEASE_ACCEPTED_UNEXPECTEDLY");
    }
    await b.query("rollback");
    console.log("PASS FRC-43 fresh concurrent duplicate RELEASED attack rejected");
  } finally { a.release(); b.release(); }
} finally { await pool.end(); }
