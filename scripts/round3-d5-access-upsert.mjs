import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  const q=await pool.query("select * from public.crm_site_chat_access order by created_at desc limit 1");
  if(!q.rows[0]) throw new Error("D5_SETUP_NO_ACCESS_ROW");
  const r=q.rows[0];
  let rejected=false;
  try {
    await pool.query(`
      insert into public.crm_site_chat_access
        (workspace_id,conversation_id,access_token_hash,issuance_proof,publication_proof,created_at,expires_at,last_seen_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (workspace_id,conversation_id,access_token_hash)
      do update set expires_at=excluded.expires_at
    `,[r.workspace_id,r.conversation_id,r.access_token_hash,r.issuance_proof,r.publication_proof,r.created_at,
       new Date(new Date(r.expires_at).getTime()+86400000).toISOString(),r.last_seen_at]);
  } catch(e) {
    rejected=/SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE/.test(String(e));
  }
  if(!rejected) throw new Error("NEW_FINDING_D5_UPSERT_CAN_EXTEND_SITECHAT_ACCESS_EXPIRY");
  console.log("PASS D5 fresh variation: UPSERT cannot extend site-chat access expiry");
} finally { await pool.end(); }
