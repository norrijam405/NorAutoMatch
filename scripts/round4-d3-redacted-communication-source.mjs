import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspace="communication-ledger-test";
const provider="NORAUTO_SITE_CHAT";
const eventId="communication-ledger-event-001";
const conversationId="communication-ledger-conversation-001";
const actor="rep-test-001";
try {
  await pool.query(
    "update public.crm_conversation_events set processing_state='REDACTED' where workspace_id=$1 and provider=$2 and event_id=$3",
    [workspace,provider,eventId]
  );
  let accepted=false;
  try {
    await pool.query(`
      insert into public.crm_conversation_contact_events (
        client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
      ) values (
        '00000000-0000-4000-8000-00000000d421'::uuid,$1,$2,$3,$4,
        'EMAIL','OUTBOUND_EXECUTION_RECORDED',$5,$6,'***@example.com','HUMAN_REP','round4:redacted-source',null
      )
    `,[workspace,provider,conversationId,eventId,actor,"4".repeat(64)]);
    accepted=true;
  } catch(e) {
    if(/COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE/.test(String(e))){
      console.log("PASS D3 Round4: REDACTED communication source rejected");
    } else throw e;
  }
  if(accepted) throw new Error("NEW_FINDING_D3_REDACTED_SOURCE_MINTS_COMMUNICATION_EXECUTION_TRUTH");
} finally { await pool.end(); }
