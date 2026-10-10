import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const workspace="round5-d2";
const provider="NORAUTO_SITE_CHAT";
const event="round5-d2-event";
const conversation="round5-d2-conversation";
const actor="round5-d2-rep";
try {
  await pool.query(`
    insert into public.crm_conversation_events (
      workspace_id,provider,event_id,conversation_id,event_type,observed_at,
      normalized_payload,routing_decision,routing_reasons,processing_state
    ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),
      $5::jsonb,'CONTACTABLE','[]'::jsonb,'REDACTED')
  `,[workspace,provider,event,conversation,JSON.stringify({customer:{communicationConsent:true,preferredContact:"EMAIL"}})]);
  await pool.query(`
    insert into public.crm_conversation_assignments (
      workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
    ) values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())
  `,[workspace,provider,conversation,actor]);

  let accepted=false;
  try {
    await pool.query(`
      insert into public.crm_conversation_contact_events (
        client_action_id,workspace_id,provider,conversation_id,source_event_id,
        channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome
      ) values (
        '00000000-0000-4000-8000-000000005002'::uuid,$1,$2,$3,$4,
        'EMAIL','OUTBOUND_EXECUTION_RECORDED',$5,$6,'***@example.com','HUMAN_REP','round5:preseed-bypass',null
      )
    `,[workspace,provider,conversation,event,actor,"5".repeat(64)]);
    accepted=true;
  } catch(e) {
    if(/COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE/.test(String(e))){
      console.log("PASS D2 Round5: FRC-21 invariant present despite preseed");
    } else throw e;
  }
  if(accepted) throw new Error("NEW_FINDING_D2_PRESEEDED_FRC21_MIGRATION_SUPPRESSES_REDACTED_SOURCE_GUARD");
} finally { await pool.end(); }
