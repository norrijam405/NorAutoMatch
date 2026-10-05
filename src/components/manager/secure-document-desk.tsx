"use client";

import { useState } from "react";
import { ExternalLink, FileCheck2, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { createManagerDocumentViewLink, deleteDueSecureDocument, reviewSecureDocument } from "@/app/manager/documents/actions";

type SecureDocumentRow = {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  kind: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  status: string;
  retention_state: string;
  delete_after: string | null;
  raw_deleted_at: string | null;
  received_at: string;
  reviewed_at: string | null;
};

export function SecureDocumentDesk({ documents }: { documents: SecureDocumentRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function view(documentId: string) {
    setBusyId(documentId);
    setMessage("");
    try {
      const form = new FormData();
      form.set("documentId", documentId);
      const result = await createManagerDocumentViewLink(form);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      setMessage("Short-lived secure view link created and audit event recorded.");
    } catch {
      setMessage("The document view link could not be created.");
    } finally {
      setBusyId(null);
    }
  }

  if (!documents.length) {
    return <p className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-500">No customer secure documents are waiting for review.</p>;
  }

  return (
    <div className="mt-8 grid gap-4">
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
      {documents.map((doc) => (
        <article key={doc.id} className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-2.5 py-1 text-emerald-300">{doc.status}</span>
                <span>{doc.kind.replaceAll("_", " ")}</span>
                <span>•</span>
                <span>{Math.max(1, Math.round(doc.byte_size / 1024))} KB</span>
              </div>
              <h2 className="mt-3 text-lg font-black text-white">{doc.original_filename}</h2>
              <p className="mt-1 text-xs text-slate-500">Customer user {doc.user_id}</p>
              <p className="mt-1 text-xs text-slate-500">{doc.opportunity_id ? `Opportunity ${doc.opportunity_id}` : "Not linked to an opportunity"}</p>
            </div>
            <button
              type="button"
              onClick={() => void view(doc.id)}
              disabled={busyId === doc.id}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-white hover:border-amber-300/40 disabled:opacity-50"
            >
              {busyId === doc.id ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              View for 60 sec
            </button>
          </div>

          <form action={reviewSecureDocument} className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[1fr_220px_auto]">
            <input type="hidden" name="documentId" value={doc.id} />
            <label>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">NorAutoMatch opportunity ID</span>
              <input name="opportunityId" defaultValue={doc.opportunity_id ?? ""} placeholder="namo_…" className="field" />
            </label>
            <label>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Review state</span>
              <select name="status" defaultValue={doc.status === "ACCEPTED" || doc.status === "REJECTED" ? doc.status : "REVIEW_REQUIRED"} className="field">
                <option value="REVIEW_REQUIRED">Review required</option>
                <option value="ACCEPTED">Accepted for desk prep</option>
                <option value="REJECTED">Rejected / replace</option>
              </select>
            </label>
            <button className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-black text-black">
              <FileCheck2 size={16} /> Save review
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[11px] leading-5 text-slate-600">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>
                Retention: {doc.retention_state.replaceAll("_", " ").toLowerCase()}
                {doc.delete_after ? ` · due ${new Date(doc.delete_after).toLocaleDateString()}` : ""}
                {doc.raw_deleted_at ? ` · raw file deleted ${new Date(doc.raw_deleted_at).toLocaleDateString()}` : ""}.
                Raw document access remains outside Torque.
              </span>
            </div>
            {doc.delete_after && !doc.raw_deleted_at && doc.retention_state !== "PRESERVED" && Date.parse(doc.delete_after) <= Date.now() ? (
              <form action={deleteDueSecureDocument}>
                <input type="hidden" name="documentId" value={doc.id} />
                <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/[.06] px-4 text-xs font-black text-rose-200 hover:border-rose-300/40">
                  <Trash2 size={14} /> Delete due raw file
                </button>
              </form>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
