import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

const pool = new Pool({ connectionString });
try {
  const userId = "00000000-0000-4000-8000-000000003001";
  await pool.query("insert into auth.users(id) values ($1::uuid) on conflict do nothing", [userId]);
  await pool.query(
    "insert into public.app_memberships(user_id,app_id,active,role) values ($1::uuid,'norautomatch',true,'founder') on conflict do nothing",
    [userId],
  );

  let accepted = false;
  try {
    await pool.query(
      `insert into public.video_hub_entries
        (id,title,summary,canonical_url,visibility,vehicle_vins,topics,channels,created_by)
       values (
        '00000000-0000-4000-8000-000000003101'::uuid,
        'Fresh publication evidence challenge',
        '',
        'https://example.com/video/fresh-evidence',
        'PUBLIC',
        '{}','{}',
        '[{"channel":"YOUTUBE","url":"https://youtube.com/watch?v=fresh","publicationState":"PUBLISHED","publicationEvidenceRef":"self-asserted-reference"}]'::jsonb,
        $1::uuid
       )`,
      [userId],
    );
    accepted = true;
  } catch {}

  if (accepted) {
    throw new Error("NEW_FINDING_D1_SELF_ASSERTED_VIDEO_PUBLICATION_EVIDENCE_ACCEPTED");
  }

  console.log("PASS D1 arbitrary self-asserted publication evidence rejected");
} finally {
  await pool.end();
}
