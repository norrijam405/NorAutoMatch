import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { ArrowLeft, Download, FileText, LockKeyhole } from "lucide-react";
import { MarkdownContent } from "@/components/docs/markdown-content";
import { DocumentActions } from "@/components/docs/document-actions";

export const metadata: Metadata = {
  title: "Master Website + CRM Build Prompt",
  description: "Internal NorAuto Match website and CRM implementation specification.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-static";

const toc = [
  ["Master prompt", "master-prompt"],
  ["Operating rules", "non-negotiable-operating-rules"],
  ["Customer segments", "customer-segments-and-jobs-to-be-done"],
  ["Website team prompt", "website-team-prompt"],
  ["CRM team prompt", "crm-team-prompt"],
  ["Shared acceptance tests", "shared-website-crm-acceptance-tests"],
  ["SEO + Ads handoff", "seo-and-advertising-handoff-rules"],
  ["Launch decisions", "decisions-required-before-production-launch"],
];

export default async function MasterBuildPromptPage() {
  const markdown = await readFile(path.join(process.cwd(), "MASTER_GROWTH_SYSTEM_BUILD_PROMPT.md"), "utf8");

  return (
    <div className="pb-24">
      <section className="border-b border-white/10 bg-slate-950/55 py-12 sm:py-16">
        <div className="shell">
          <Link href="/playbook" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to growth playbook</Link>
          <div className="mt-8 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-2 text-xs font-bold text-emerald-200"><FileText size={14} /> Source of truth</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-slate-300"><LockKeyhole size={14} /> Noindex · team handoff</span></div>
              <h1 className="mt-5 text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">Master Website + CRM Build Prompt</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">The complete operating specification for the Website, CRM, SEO, and Advertising teams. Share this page—not a stack of disconnected notes.</p>
            </div>
            <div className="flex flex-col gap-3">
              <DocumentActions />
              <a href="/master-build-prompt/download" className="btn-primary min-h-10 px-4 py-2"><Download size={16} /> Download Markdown</a>
            </div>
          </div>
        </div>
      </section>

      <div className="shell grid gap-12 pt-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="prompt-toc hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <p className="eyebrow">Jump to</p>
            <nav className="mt-4 grid gap-1" aria-label="Document sections">
              {toc.map(([label, href]) => <a key={href} href={`#${href}`} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white">{label}</a>)}
            </nav>
          </div>
        </aside>
        <article className="prompt-document min-w-0 max-w-4xl rounded-3xl border border-white/10 bg-slate-900/35 px-5 py-7 shadow-card sm:px-9 sm:py-10">
          <MarkdownContent markdown={markdown} />
        </article>
      </div>
    </div>
  );
}
