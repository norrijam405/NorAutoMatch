import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
const creator="00000000-0000-4000-8000-000000000001";
try {
  for (const evidence of [123,true,{fake:"receipt"},["fake","receipt"]]) {
    let rejected=false;
    try {
      await pool.query(`
        insert into public.video_hub_entries (
          id,title,summary,canonical_url,visibility,vehicle_vins,topics,channels,created_by
        ) values (
          gen_random_uuid(),'Malformed evidence','','https://example.com/video/frc17','PUBLIC','{}','{}',$1::jsonb,$2::uuid
        )
      `,[JSON.stringify([{channel:"YOUTUBE",url:"https://youtube.com/watch?v=frc17",publicationState:"PUBLISHED",publicationEvidenceRef:evidence}]),creator]);
    } catch { rejected=true; }
    if(!rejected) throw new Error("FRC17_MALFORMED_PUBLICATION_EVIDENCE_ACCEPTED:"+JSON.stringify(evidence));
  }
  await pool.query(`
    insert into public.video_hub_entries (
      id,title,summary,canonical_url,visibility,vehicle_vins,topics,channels,created_by
    ) values (
      gen_random_uuid(),'Valid evidence','','https://example.com/video/frc17-valid','PUBLIC','{}','{}',$1::jsonb,$2::uuid
    )
  `,[JSON.stringify([{channel:"YOUTUBE",url:"https://youtube.com/watch?v=frc17valid",publicationState:"PUBLISHED",publicationEvidenceRef:"provider-receipt:frc17-valid"}]),creator]);
  console.log("PASS FRC-17 malformed publication evidence types rejected");
  console.log("PASS FRC-17 valid string publication evidence preserved");
} finally { await pool.end(); }
