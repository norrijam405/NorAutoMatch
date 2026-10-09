import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");
const pool = new Pool({ connectionString });

try {
  const client = await pool.connect();
  let accepted = false;
  try {
    await client.query("begin");
    await client.query(`create temporary table crm_conversation_events (
      workspace_id text,
      provider text,
      event_id text,
      conversation_id text,
      normalized_payload jsonb,
      processing_state text
    ) on commit drop`);
    await client.query(`create temporary table crm_conversation_assignments (
      workspace_id text,
      provider text,
      conversation_id text,
      assignment_state text,
      assignee_subject_id text
    ) on commit drop`);

    await client.query(`
      insert into crm_conversation_events values (
        'shadow-workspace',
        'NORAUTO_SITE_CHAT',
        'shadow-event',
        'shadow-conversation',
        '{"customer":{"communicationConsent":true,"preferredContact":"EMAIL"}}'::jsonb,
        'RECEIVED'
      )`);

    await client.query(`
      insert into crm_conversation_assignments values (
        'shadow-workspace',
        'NORAUTO_SITE_CHAT',
        'shadow-conversation',
        'ASSIGNED',
        'shadow-rep'
      )`);

    await client.query("set local search_path=pg_temp,public");

    await client.query(
      `insert into public.crm_conversation_contact_events (
        client_action_id,
        workspace_id,
        provider,
        conversation_id,
        source_event_id,
        channel,
        event_type,
        actor_subject_id,
        target_hash,
        target_hint,
        evidence_authority,
        evidence_ref,
        delivery_outcome
      ) values (
        '00000000-0000-4000-8000-000000003301'::uuid,
        'shadow-workspace',
        'NORAUTO_SITE_CHAT',
        'shadow-conversation',
        'shadow-event',
        'EMAIL',
        'OUTBOUND_EXECUTION_RECORDED',
        'shadow-rep',
        $1,
        '***@example.com',
        'HUMAN_REP',
        'fresh-shadow-reference',
        null
      )`,
      ["3".repeat(64)],
    );

    await client.query("commit");
    accepted = true;
  } catch {
    try { await client.query("rollback"); } catch {}
  } finally {
    client.release();
  }

  if (accepted) {
    throw new Error("NEW_FINDING_D3_TEMP_RELATION_SHADOW_MINTS_COMMUNICATION_EXECUTION_TRUTH");
  }

  console.log("PASS D3 communication truth rejects caller-controlled relation shadow");
} finally {
  await pool.end();
}
