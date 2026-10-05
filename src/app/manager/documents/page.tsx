import type { Metadata } from "next";
import Link from "next/link";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { SecureDocumentDesk } from "@/components/manager/secure-document-desk";

export const metadata: Metadata = {
  title: "Secure Document Desk",
  description: "Restricted NorAuto Match customer-document review surface.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ManagerDocumentsPage() {
  const { supabase } = await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/documents");
  const { data: documents } = await supabase
    .from("customer_secure_documents")
    .select("id,user_id,opportunity_id,kind,original_filename,mime_type,byte_size,status,retention_state,received_at,reviewed_at")
    .order("received_at", { ascending: false })
    .limit(100);

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow">Restricted operator surface</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Secure document desk</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">
            Review customer-supplied deal documents without placing raw files in Torque conversations. Signed view links expire after 60 seconds.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            This desk does not submit credit applications, choose lenders, approve financing, or alter final deal authority.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
            <Link href="/manager" className="text-amber-300 hover:text-amber-200">← Manager workbench</Link>
            <Link href="/manager/conversations" className="text-amber-300 hover:text-amber-200">Conversation desk →</Link>
          </div>
        </div>
        <SecureDocumentDesk documents={documents ?? []} />
      </div>
    </section>
  );
}
