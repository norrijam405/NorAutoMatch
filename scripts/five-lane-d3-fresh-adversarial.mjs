import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  let rejected=false;
  try {
    await pool.query(`
      insert into crm_conversation_contact_events (
        client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
      )
      select '00000000-0000-4000-8000-00000000d306'::uuid,
             workspace_id,provider,conversation_id,source_event_id,
             channel,'DELIVERY_EVIDENCE_RECORDED',actor_subject_id,target_hash,target_hint,
             'PROVIDER_RECEIPT_REPORTED_BY_REP','fresh-insert-select-forged-receipt','DELIVERED'
        from crm_conversation_contact_events
       where workspace_id='communication-ledger-test'
         and client_action_id='00000000-0000-4000-8000-000000000003'::uuid
    `);
  } catch(e) {
    rejected=/COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED/.test(String(e));
  }
  if(!rejected) throw new Error("NEW_FINDING_D3_INSERT_SELECT_CAN_MINT_PROVIDER_DELIVERY_TRUTH");
  console.log("PASS D3 fresh variation: INSERT...SELECT cannot mint provider delivery truth");
} finally { await pool.end(); }
