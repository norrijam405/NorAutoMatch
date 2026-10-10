import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  const ins=await pool.query(`insert into public.crm_conversation_assignment_events
    (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
    values ('round6-d4','NORAUTO_SITE_CHAT','round6-d4-conversation','CLAIMED','rep-a','rep-a')
    returning id`);
  const id=ins.rows[0]?.id;
  let updateAccepted=false;
  try {
    await pool.query("update public.crm_conversation_assignment_events set actor_subject_id='attacker' where id=$1",[id]);
    updateAccepted=true;
  } catch {}
  let deleteAccepted=false;
  try {
    await pool.query("delete from public.crm_conversation_assignment_events where id=$1",[id]);
    deleteAccepted=true;
  } catch {}
  if(updateAccepted || deleteAccepted) {
    throw new Error(`NEW_FINDING_D4_ASSIGNMENT_EVENT_APPEND_ONLY_EVIDENCE_MUTABLE:update=${updateAccepted}:delete=${deleteAccepted}`);
  }
  console.log("PASS D4 Round6: assignment events immutable");
} finally { await pool.end(); }
