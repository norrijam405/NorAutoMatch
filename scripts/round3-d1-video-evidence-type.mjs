import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  await pool.query("delete from public.video_hub_entries where id=$1::uuid",["00000000-0000-4000-8000-00000000d301"]).catch(()=>{});
  let accepted=false;
  try {
    await pool.query(`
      insert into public.video_hub_entries (
        id,title,summary,canonical_url,visibility,vehicle_vins,topics,channels,created_by
      ) values (
        '00000000-0000-4000-8000-00000000d301',
        'Fresh malformed publication evidence',
        '',
        'https://example.com/video/round3-d1',
        'PUBLIC',
        '{}',
        '{}',
        '[{"channel":"YOUTUBE","url":"https://youtube.com/watch?v=round3d1","publicationState":"PUBLISHED","publicationEvidenceRef":123}]'::jsonb,
        '00000000-0000-4000-8000-000000000001'
      )
    `);
    accepted=true;
  } catch {}
  if(accepted){
    throw new Error("NEW_FINDING_D1_NONSTRING_PUBLICATION_EVIDENCE_MINTS_PUBLISHED_TRUTH");
  }
  console.log("PASS D1 fresh variation: malformed non-string publication evidence rejected");
} finally { await pool.end(); }
