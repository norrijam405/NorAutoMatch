import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { secureDocumentKindSchema } from "@/lib/customer-secure-document";
import { validateSecureDocumentFile } from "@/lib/secure-document-file-validation";

export const runtime = "nodejs";

const BUCKET = "customer-secure-documents";
const MAX_MULTIPART_REQUEST_BYTES = 13 * 1024 * 1024;

function secureDocumentRuntimeConfig() {
  if (process.env.NORAUTO_SECURE_DOCUMENTS_ACTIVATION !== "ACTIVE") return null;
  const retentionDays = Number.parseInt(process.env.NORAUTO_SECURE_DOCUMENT_RETENTION_DAYS ?? "", 10);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) return null;
  return { retentionDays };
}

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (!origin || origin !== requestOrigin) {
    return NextResponse.json(
      { message: "Cross-origin document uploads are not accepted." },
      { status: 403 },
    );
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_REQUEST_BYTES) {
    return NextResponse.json({ message: "Document request is too large." }, { status: 413 });
  }

  const runtimeConfig = secureDocumentRuntimeConfig();
  if (!runtimeConfig) {
    return NextResponse.json(
      { message: "Secure deal-document upload is not activated yet." },
      { status: 503 },
    );
  }

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

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileValidation = validateSecureDocumentFile({
    declaredMime: file.type,
    byteSize: file.size,
    bytes,
  });
  if (!fileValidation.ok) {
    const status = fileValidation.reason === "FILE_TOO_LARGE" ? 413 : 415;
    return NextResponse.json(
      { message: "Use a genuine PDF, JPG, PNG, or WebP file no larger than 12 MB." },
      { status },
    );
  }

  const documentId = randomUUID();
  const storagePath = `${user.id}/${documentId}.${fileValidation.extension}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const { error: registrationError } = await supabase.rpc(
    "norautomatch_register_customer_secure_document_v2",
    {
      p_id: documentId,
      p_kind: kindParsed.data,
      p_storage_path: storagePath,
      p_original_filename: file.name.slice(0, 255) || `document.${fileValidation.extension}`,
      p_mime_type: file.type,
      p_byte_size: file.size,
      p_sha256: sha256,
      p_retention_days: runtimeConfig.retentionDays,
    },
  );
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
