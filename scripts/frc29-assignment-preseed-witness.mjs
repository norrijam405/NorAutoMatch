import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspace="round6-d2";
const provider="NORAUTO_SITE_CHAT";
const conversation="round6-d2-conversation";
try {
  let accepted=false;
  try {
    await pool.query(`insert into public.crm_conversation_assignments
      (workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at)
      values ($1,$2,$3,'attacker','ASSIGNED',clock_timestamp(),clock_timestamp())`,
      [workspace,provider,conversation]);
    accepted=true;
  } catch(e) {
    if(/CONVERSATION_ASSIGNMENT_AUTHENTICITY_REQUIRED/.test(String(e))){
      console.log("PASS D2 Round6: preseeded ownership-auth migration did not suppress guard");
    } else throw e;
  }
  if(accepted) throw new Error("NEW_FINDING_D2_PRESEEDED_FRC25_MIGRATION_SUPPRESSES_ASSIGNMENT_AUTHORITY");
} finally { await pool.end(); }
