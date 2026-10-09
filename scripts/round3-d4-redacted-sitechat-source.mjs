import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  const q=await pool.query(`
    select a.workspace_id,a.conversation_id,r.source_event_id,r.published_by
      from public.crm_site_chat_access a
      join public.crm_site_chat_replies r
        on r.workspace_id=a.workspace_id and r.conversation_id=a.conversation_id
     order by r.published_at desc limit 1
  `);
  if(!q.rows[0]) throw new Error("D4_SETUP_NO_SITECHAT_THREAD");
  const x=q.rows[0];
  await pool.query("update public.crm_conversation_events set processing_state='REDACTED' where workspace_id=$1 and provider='NORAUTO_SITE_CHAT' and event_id=$2",[x.workspace_id,x.source_event_id]);
  let rejected=false;
  try {
    await pool.query(`
      insert into public.crm_site_chat_replies
        (workspace_id,conversation_id,source_event_id,body,published_by)
      values ($1,$2,$3,'round3 redacted-source forgery',$4)
    `,[x.workspace_id,x.conversation_id,x.source_event_id,x.published_by]);
  } catch(e) {
    rejected=/SITE_CHAT_REPLY_EVENT_NOT_ELIGIBLE/.test(String(e));
  }
  if(!rejected) throw new Error("NEW_FINDING_D4_REDACTED_SITECHAT_SOURCE_CAN_PUBLISH");
  console.log("PASS D4 fresh variation: redacted source cannot publish site-chat reply");
} finally { await pool.end(); }
