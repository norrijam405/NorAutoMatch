import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  const q=await pool.query(`
    select workspace_id,conversation_id,reply_id,source_event_id,body,published_by,delivery_channel,delivery_state,published_at,redacted_at
      from crm_site_chat_replies
     order by published_at desc limit 1
  `);
  if(!q.rows[0]) throw new Error("D4_SETUP_NO_PUBLISHED_REPLY");
  const r=q.rows[0];
  let rejected=false;
  try {
    await pool.query(`
      insert into crm_site_chat_replies
        (workspace_id,conversation_id,reply_id,source_event_id,body,published_by,delivery_channel,delivery_state,published_at,redacted_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict (workspace_id,conversation_id,reply_id)
      do update set body='fresh-upsert-rewrite-attempt'
    `,[r.workspace_id,r.conversation_id,r.reply_id,r.source_event_id,r.body,r.published_by,r.delivery_channel,r.delivery_state,r.published_at,r.redacted_at]);
  } catch(e) {
    rejected=/SITE_CHAT_REPLY_PUBLISHED_EVIDENCE_IMMUTABLE/.test(String(e));
  }
  if(!rejected) throw new Error("NEW_FINDING_D4_UPSERT_CAN_REWRITE_PUBLISHED_REPLY");
  console.log("PASS D4 fresh variation: UPSERT cannot rewrite published site-chat evidence");
} finally { await pool.end(); }
