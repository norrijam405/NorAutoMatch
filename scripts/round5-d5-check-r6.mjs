import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.NORAUTO_CRM_DATABASE_URL});
try {
  const q=await pool.query(`
    select pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'
       and p.proname='norauto_reject_site_chat_publication_anchor_mutation'
  `);
  const def=q.rows[0]?.def ?? "";
  if(!def.includes("site_chat_rotation_previous_secret")){
    throw new Error("NEW_FINDING_D5_PRESEEDED_R6_MIGRATION_SUPPRESSES_ROTATION_GUARD");
  }
  console.log("PASS D5 Round5: r6 rotation invariant present despite migration preseed");
} finally { await pool.end(); }
