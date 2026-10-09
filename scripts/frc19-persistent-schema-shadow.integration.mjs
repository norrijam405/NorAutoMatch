import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.NORAUTO_CRM_DATABASE_URL });

try {
  const client = await pool.connect();
  let accepted = false;
  try {
    await client.query("begin");
    await client.query("create schema if not exists attacker_shadow");
    await client.query("drop table if exists attacker_shadow.crm_conversation_events");
    await client.query("drop table if exists attacker_shadow.crm_conversation_assignments");
    await client.query("create table attacker_shadow.crm_conversation_events (workspace_id text,provider text,event_id text,conversation_id text,normalized_payload jsonb,processing_state text)");
    await client.query("create table attacker_shadow.crm_conversation_assignments (workspace_id text,provider text,conversation_id text,assignment_state text,assignee_subject_id text)");
    await client.query("insert into attacker_shadow.crm_conversation_events values ('shadow-workspace','NORAUTO_SITE_CHAT','shadow-event','shadow-conversation','{\"customer\":{\"communicationConsent\":true,\"preferredContact\":\"EMAIL\"}}'::jsonb,'RECEIVED')");
    await client.query("insert into attacker_shadow.crm_conversation_assignments values ('shadow-workspace','NORAUTO_SITE_CHAT','shadow-conversation','ASSIGNED','shadow-rep')");
    await client.query("set local search_path=attacker_shadow,public");
    await client.query(`insert into public.crm_conversation_contact_events
      (client_action_id,workspace_id,provider,conversation_id,source_event_id,channel,event_type,actor_subject_id,target_hash,target_hint,evidence_authority,evidence_ref,delivery_outcome)
      values ('00000000-0000-4000-8000-000000001902'::uuid,'shadow-workspace','NORAUTO_SITE_CHAT','shadow-conversation','shadow-event','EMAIL','OUTBOUND_EXECUTION_RECORDED','shadow-rep',$1,'***@example.com','HUMAN_REP','persistent-shadow-ref',null)`,
      ["2".repeat(64)]);
    await client.query("commit");
    accepted = true;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    if (!/COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE|COMMUNICATION_CONVERSATION_OWNERSHIP_REQUIRED/.test(String(error))) throw error;
  } finally {
    client.release();
  }

  if (accepted) throw new Error("FRC19_PERSISTENT_SCHEMA_SHADOW_STILL_ACCEPTED");
  console.log("PASS FRC-19 fresh persistent-schema shadow carries no communication authority");
} finally {
  await pool.end();
}
