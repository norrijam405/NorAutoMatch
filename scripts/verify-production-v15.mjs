import {createHash} from "node:crypto";
import pg from "pg";
const {Client}=pg;
const connectionString=process.env.NORAUTO_CRM_DATABASE_URL;
const current=process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim() ?? "";
const previous=process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim() ?? "";
if(!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");
if(current.length<32) throw new Error("current secret required");
const digest=(secret)=>createHash("sha256").update("norautomatch:customer-binding:v1\u001f"+secret).digest("hex");
const client=new Client({connectionString});
await client.connect();
try {
  const migration=await client.query(
    "select 1 from norautomatch_schema_migrations where migration_name=$1",
    ["infrastructure/norautomatch-crm-v15-customer-binding-secret-rotation.sql"]
  );
  if(migration.rowCount!==1) throw new Error("V15_MIGRATION_NOT_RECORDED");
  const row=await client.query(
    "select binding_secret_sha256,previous_secret_sha256 from public.crm_customer_binding_secret_anchor where anchor_id='ACTIVE'"
  );
  if(row.rowCount!==1) throw new Error("V15_ANCHOR_MISSING");
  if(row.rows[0].binding_secret_sha256?.trim()!==digest(current)) throw new Error("V15_CURRENT_DIGEST_MISMATCH");
  const recordedPrevious=row.rows[0].previous_secret_sha256?.trim() ?? null;
  const expectedPrevious=previous ? digest(previous) : null;
  if(recordedPrevious!==expectedPrevious) throw new Error("V15_PREVIOUS_DIGEST_MISMATCH");
  console.log("PASS FRC-22 customer binding trust anchor matches governed current/previous secrets");
} finally { await client.end(); }
