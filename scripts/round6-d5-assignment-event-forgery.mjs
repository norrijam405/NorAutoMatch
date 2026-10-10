import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  let accepted=false;
  try {
    await pool.query(`insert into public.crm_conversation_assignment_events
      (workspace_id,provider,conversation_id,action,actor_subject_id,assignee_subject_id)
      values ('round6-d5','NORAUTO_SITE_CHAT','nonexistent-conversation','CLAIMED','attacker','victim-rep')`);
    accepted=true;
  } catch {}
  if(accepted) throw new Error("NEW_FINDING_D5_DIRECT_SQL_CAN_FORGE_ASSIGNMENT_EVENT_EVIDENCE");
  console.log("PASS D5 Round6: forged assignment event rejected");
} finally { await pool.end(); }
