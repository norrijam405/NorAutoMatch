import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspace="communication-ledger-test";
const provider="NORAUTO_SITE_CHAT";
const eventId="communication-ledger-event-001";
const conversationId="communication-ledger-conversation-001";
const actor="rep-test-001";
try {
  const updated=await pool.query(
    "update public.crm_conversation_events set processing_state='REDACTED' where workspace_id=$1 and provider=$2 and event_id=$3 returning event_id",
    [workspace,provider,eventId]
  );
  if(updated.rowCount!==1) throw new Error("FRC21_SETUP_EVENT_MISSING");

  let rejected=false;
  try {
    await pool.query(`
      insert into public.crm_conversation_contact_events (
        client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
      ) values (
        '00000000-0000-4000-8000-000000002101'::uuid,$1,$2,$3,$4,
        'EMAIL','OUTBOUND_EXECUTION_RECORDED',$5,$6,'***@example.com',
        'HUMAN_REP','frc21:redacted-source',null
      )
    `,[workspace,provider,conversationId,eventId,actor,"2".repeat(64)]);
  } catch(e) {
    rejected=/COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE/.test(String(e));
  }
  if(!rejected) throw new Error("FRC21_REDACTED_SOURCE_STILL_MINTS_COMMUNICATION_EXECUTION_TRUTH");

  const count=await pool.query(
    "select count(*)::int as count from public.crm_conversation_contact_events where client_action_id='00000000-0000-4000-8000-000000002101'::uuid"
  );
  if(count.rows[0]?.count!==0) throw new Error("FRC21_REJECTED_ROW_PERSISTED");

  console.log("PASS FRC-21 REDACTED source cannot mint communication execution truth");
} finally { await pool.end(); }
