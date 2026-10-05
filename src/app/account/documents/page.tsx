import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/supabase/authz";
import { SecureDocumentUploader } from "@/components/account/secure-document-uploader";

export const metadata: Metadata = {
  title: "Secure Deal Documents",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SecureDocumentsPage() {
  const { supabase, userId } = await requireAuthenticatedUser("/account/documents");
  const { data: documents } = await supabase
    .from("customer_secure_documents")
    .select("id,kind,original_filename,status,received_at,opportunity_id,retention_state,delete_after,raw_deleted_at")
    .eq("user_id", userId)
    .order("received_at", { ascending: false });

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell max-w-4xl">
        <p className="eyebrow">Protected customer workspace</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Secure deal documents</h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">
          Upload documents that help the sales desk prepare your deal. Files stay in private storage. Torque receives only a document-status signal, not the raw file.
        </p>
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-4 text-sm leading-6 text-slate-300">
          Do not upload Social Security numbers, bank-login credentials, or credit-card information here. This workspace does not submit a credit application or send anything to a lender.
        </div>

        <SecureDocumentUploader />

        <div className="mt-10">
          <h2 className="text-xl font-black text-white">Your uploaded documents</h2>
          <div className="mt-4 grid gap-3">
            {documents?.length ? documents.map((doc) => (
              <article key={doc.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{doc.kind.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-slate-500">{doc.original_filename}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="font-bold text-emerald-300">{doc.status}</span>
                    <span className="mx-2">•</span>
                    {new Date(doc.received_at).toLocaleString()}
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  {doc.opportunity_id ? "Attached to a desk-prep opportunity." : "Not yet attached to a desk-prep opportunity."}
                  {" "}Retention: {doc.retention_state.replaceAll("_", " ").toLowerCase()}
                  {doc.delete_after ? ` · scheduled through ${new Date(doc.delete_after).toLocaleDateString()}` : ""}
                  {doc.raw_deleted_at ? ` · raw file deleted ${new Date(doc.raw_deleted_at).toLocaleDateString()}` : ""}.
                </p>
              </article>
            )) : <p className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-500">No secure documents uploaded yet.</p>}
          </div>
        </div>

        <Link href="/account" className="mt-8 inline-block text-sm font-black text-amber-300 hover:text-amber-200">← Back to account</Link>
      </div>
    </section>
  );
}
