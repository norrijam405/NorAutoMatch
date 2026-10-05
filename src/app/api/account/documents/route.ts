import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { secureDocumentKindSchema } from "@/lib/customer-secure-document";

export const runtime = "nodejs";

const BUCKET = "customer-secure-documents";
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) {
    return NextResponse.json({ message: "Sign in before uploading deal documents." }, { status: 401 });
  }

  const form = await request.formData();
  const kindParsed = secureDocumentKindSchema.safeParse(String(form.get("kind") ?? ""));
  const file = form.get("file");

  if (!kindParsed.success) {
    return NextResponse.json({ message: "Choose a supported document type." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ message: "Choose a document to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "Document must be 12 MB or smaller." }, { status: 413 });
  }

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return NextResponse.json({ message: "Use PDF, JPG, PNG, or WebP." }, { status: 415 });
  }

  const documentId = randomUUID();
  const storagePath = `${user.id}/${documentId}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const { error: registrationError } = await supabase.rpc("norautomatch_register_customer_secure_document", {
    p_id: documentId,
    p_kind: kindParsed.data,
    p_storage_path: storagePath,
    p_original_filename: file.name.slice(0, 255) || `document.${extension}`,
    p_mime_type: file.type,
    p_byte_size: file.size,
    p_sha256: sha256,
  });
  if (registrationError) {
    return NextResponse.json({ message: "The document could not be registered safely." }, { status: 503 });
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    await supabase.rpc("norautomatch_abandon_pending_customer_secure_document", { p_id: documentId });
    return NextResponse.json({ message: "Secure storage rejected the upload." }, { status: 503 });
  }

  const { error: finalizeError } = await supabase.rpc("norautomatch_finalize_customer_secure_document", {
    p_id: documentId,
  });
  if (finalizeError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    await supabase.rpc("norautomatch_abandon_pending_customer_secure_document", { p_id: documentId });
    return NextResponse.json({ message: "The document upload could not be finalized safely." }, { status: 503 });
  }

  return NextResponse.json({
    accepted: true,
    protocol: "NORAUTO_SECURE_DOCUMENT_RECEIPT_V1",
    documentId,
    kind: kindParsed.data,
    status: "RECEIVED",
    rawDocumentExposedToAgent: false,
    lenderSubmission: "NOT_PERFORMED",
    authorityEffect: "NONE",
  }, { status: 201 });
}
