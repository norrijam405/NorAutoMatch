import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const creator="00000000-0000-4000-8000-000000000001";
try {
  for (const evidence of [123,true,{fake:"receipt"},["fake","receipt"],"provider-receipt:self-asserted"]) {
    let rejected=false;
    try {
      await pool.query(`
        insert into public.video_hub_entries (
          id,title,summary,canonical_url,visibility,vehicle_vins,topics,channels,created_by
        ) values (
          gen_random_uuid(),'Round4 PUBLISHED challenge','','https://example.com/video/r4d1','PUBLIC','{}','{}',$1::jsonb,$2::uuid
        )
      `,[JSON.stringify([{channel:"YOUTUBE",url:"https://youtube.com/watch?v=r4d1",publicationState:"PUBLISHED",publicationEvidenceRef:evidence}]),creator]);
    } catch { rejected=true; }
    if(!rejected) throw new Error("NEW_FINDING_D1_PUBLISHED_VIDEO_TRUTH_NOT_FAIL_CLOSED:"+JSON.stringify(evidence));
  }
  console.log("PASS D1 Round4: PUBLISHED video truth remains fail-closed");
} finally { await pool.end(); }
