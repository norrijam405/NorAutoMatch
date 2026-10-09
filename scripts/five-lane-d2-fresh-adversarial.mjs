import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  let rejected=false;
  try {
    await pool.query(`
      insert into crm_conversation_contact_events (
        communication_event_id,client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
      )
      select gen_random_uuid(),client_action_id,workspace_id,provider,conversation_id,source_event_id,
             channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,
             'fresh-upsert-rewrite-attempt',delivery_outcome
        from crm_conversation_contact_events
       where workspace_id='communication-ledger-test'
         and client_action_id='00000000-0000-4000-8000-000000000003'::uuid
      on conflict (workspace_id,client_action_id)
      do update set evidence_ref=excluded.evidence_ref
    `);
  } catch(e) {
    rejected=/append-only/i.test(String(e));
  }
  if(!rejected) throw new Error("NEW_FINDING_D2_UPSERT_CAN_REWRITE_APPEND_ONLY_LEDGER");
  console.log("PASS D2 fresh variation: UPSERT cannot rewrite append-only communication evidence");
} finally { await pool.end(); }
