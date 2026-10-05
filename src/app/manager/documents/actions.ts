"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Pool } from "pg";
import { requireNorAutoMembership } from "@/lib/supabase/authz";

const documentIdSchema = z.string().uuid();
const opportunityIdSchema = z.string().regex(/^namo_[0-9a-f]{24}$/);
const reviewStateSchema = z.enum(["REVIEW_REQUIRED", "ACCEPTED", "REJECTED"]);

let crmPool: Pool | undefined;

function getCrmPool() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("CRM database connection is not configured.");
  crmPool ??= new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return crmPool;
}

export async function reviewSecureDocument(formData: FormData) {
  const documentId = documentIdSchema.parse(String(formData.get("documentId") ?? ""));
  const status = reviewStateSchema.parse(String(formData.get("status") ?? ""));
  const opportunityRaw = String(formData.get("opportunityId") ?? "").trim();
  const opportunityId = opportunityRaw ? opportunityIdSchema.parse(opportunityRaw) : null;

  const { supabase, userId } = await requireNorAutoMembership(
    ["operator", "admin", "founder"],
    "/manager/documents",
  );

  if (opportunityId) {
    const pool = getCrmPool();
    const result = await pool.query(
      "select 1 from crm_opportunities where workspace_id = $1 and opportunity_id = $2 limit 1",
      ["norautomatch", opportunityId],
    );
    if (result.rowCount !== 1) throw new Error("That NorAutoMatch opportunity could not be verified.");
  }

  const { data: existing, error: readError } = await supabase
    .from("customer_secure_documents")
    .select("id,user_id,storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (readError || !existing) throw new Error("Secure document not found.");

  const { error: updateError } = await supabase
    .from("customer_secure_documents")
    .update({
      opportunity_id: opportunityId,
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq("id", documentId);
  if (updateError) throw updateError;

  const { error: auditError } = await supabase.from("customer_secure_document_access_events").insert({
    document_id: documentId,
    actor_user_id: userId,
    action: "MANAGER_METADATA_REVIEWED",
  });
  if (auditError) throw auditError;

  revalidatePath("/manager/documents");
}

export async function createManagerDocumentViewLink(formData: FormData) {
  const documentId = documentIdSchema.parse(String(formData.get("documentId") ?? ""));
  const { supabase, userId } = await requireNorAutoMembership(
    ["operator", "admin", "founder"],
    "/manager/documents",
  );

  const { data: doc, error } = await supabase
    .from("customer_secure_documents")
    .select("id,storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !doc) throw new Error("Secure document not found.");

  const { data: signed, error: signError } = await supabase.storage
    .from("customer-secure-documents")
    .createSignedUrl(doc.storage_path, 60);
  if (signError || !signed?.signedUrl) throw new Error("Could not create a short-lived document view link.");

  const { error: auditError } = await supabase.from("customer_secure_document_access_events").insert({
    document_id: documentId,
    actor_user_id: userId,
    action: "MANAGER_VIEW_LINK_CREATED",
  });
  if (auditError) throw auditError;

  return { signedUrl: signed.signedUrl, expiresInSeconds: 60 };
}
