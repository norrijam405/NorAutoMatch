import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspace="communication-ledger-test";
const provider="NORAUTO_SITE_CHAT";
const conversation="communication-ledger-conversation-001";
const event="communication-ledger-event-001";
const attacker="round5-direct-sql-attacker";
try {
  const before=await pool.query(
    "select assignee_subject_id from public.crm_conversation_assignments where workspace_id=$1 and provider=$2 and conversation_id=$3",
    [workspace,provider,conversation]
  );
  if(before.rowCount!==1) throw new Error("D3_SETUP_ASSIGNMENT_MISSING");

  await pool.query(
    "update public.crm_conversation_assignments set assignee_subject_id=$1,updated_at=clock_timestamp() where workspace_id=$2 and provider=$3 and conversation_id=$4",
    [attacker,workspace,provider,conversation]
  );

  let accepted=false;
  try {
    await pool.query(`
      insert into public.crm_conversation_contact_events (
        client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
      ) values (
        '00000000-0000-4000-8000-000000005003'::uuid,$1,$2,$3,$4,
        'EMAIL','OUTBOUND_EXECUTION_RECORDED',$5,$6,'***@example.com','HUMAN_REP','round5:assignment-rewrite',null
      )
    `,[workspace,provider,conversation,event,attacker,"6".repeat(64)]);
    accepted=true;
  } catch(e) {
    if(/COMMUNICATION_CONVERSATION_OWNERSHIP_REQUIRED/.test(String(e))){
      console.log("PASS D3 Round5: rewritten assignment carries no communication authority");
    } else throw e;
  }

  if(accepted) throw new Error("NEW_FINDING_D3_DIRECT_SQL_ASSIGNMENT_REWRITE_MINTS_COMMUNICATION_AUTHORITY");
} finally { await pool.end(); }
