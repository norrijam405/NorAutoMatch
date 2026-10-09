import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.NORAUTO_CRM_DATABASE_URL });

try {
  const conversationId = "site-00000000-0000-4000-8000-000000000001";
  const client = await pool.connect();
  let accepted = false;
  try {
    await client.query("begin");
    await client.query("create schema if not exists attacker_shadow");
    await client.query("drop table if exists attacker_shadow.crm_conversation_events");
    await client.query("drop table if exists attacker_shadow.crm_conversation_assignments");
    await client.query("create table attacker_shadow.crm_conversation_events (workspace_id text,provider text,event_id text,conversation_id text,processing_state text)");
    await client.query("create table attacker_shadow.crm_conversation_assignments (workspace_id text,provider text,conversation_id text,assignment_state text,assignee_subject_id text)");
    await client.query("insert into attacker_shadow.crm_conversation_events values ('norautomatch','NORAUTO_SITE_CHAT','persistent-shadow-event',$1,'RECEIVED')",[conversationId]);
    await client.query("insert into attacker_shadow.crm_conversation_assignments values ('norautomatch','NORAUTO_SITE_CHAT',$1,'ASSIGNED','persistent-shadow-rep')",[conversationId]);
    await client.query("set local search_path=attacker_shadow,public");
    await client.query("select set_config('norautomatch.site_chat_publication_hmac_secret',$1,true)",[process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET]);
    await client.query("select set_config('norautomatch.site_chat_publication_previous_hmac_secret','',true)");
    await client.query(`insert into public.crm_site_chat_replies(workspace_id,conversation_id,source_event_id,body,published_by)
      values ('norautomatch',$1,'persistent-shadow-event','persistent schema shadow reply','persistent-shadow-rep')`,[conversationId]);
    await client.query("commit");
    accepted = true;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    if (!/SITE_CHAT_REPLY_EVENT_NOT_ELIGIBLE|SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED/.test(String(error))) throw error;
  } finally {
    client.release();
  }

  if (accepted) throw new Error("FRC20_PERSISTENT_SCHEMA_SHADOW_STILL_ACCEPTED");
  console.log("PASS FRC-20 fresh persistent-schema shadow carries no site-chat event/owner authority");
} finally {
  await pool.end();
}
