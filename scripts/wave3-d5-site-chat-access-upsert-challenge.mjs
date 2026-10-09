import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const pool = new Pool({ connectionString });

try {
  const result = await pool.query(`
    select workspace_id, conversation_id, access_token_hash, issuance_proof,
           publication_proof, created_at, expires_at, last_seen_at
      from public.crm_site_chat_access
     where issuance_proof is not null
     order by created_at desc
     limit 1
  `);

  const row = result.rows[0];
  if (!row) throw new Error("D5_SETUP_NO_AUTHENTIC_SITE_CHAT_ACCESS_ROW");

  let rejected = false;
  try {
    await pool.query(
      `insert into public.crm_site_chat_access (
        workspace_id, conversation_id, access_token_hash, issuance_proof,
        publication_proof, created_at, expires_at, last_seen_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (workspace_id, conversation_id, access_token_hash)
      do update set expires_at = clock_timestamp() + interval '30 days'`,
      [
        row.workspace_id,
        row.conversation_id,
        row.access_token_hash,
        row.issuance_proof,
        row.publication_proof,
        row.created_at,
        row.expires_at,
        row.last_seen_at,
      ],
    );
  } catch (error) {
    rejected = /SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE/.test(String(error));
  }

  if (!rejected) {
    throw new Error("NEW_FINDING_D5_UPSERT_CAN_MUTATE_SITE_CHAT_ACCESS_CAPABILITY");
  }

  console.log("PASS D5 site-chat access UPSERT cannot mutate capability");
} finally {
  await pool.end();
}
