import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, FileText, LockKeyhole } from "lucide-react";
import { PromptActions } from "./prompt-actions";

export const metadata: Metadata = {
  title: "Master Website + CRM Build Prompt",
  description: "Internal NorAuto Match website and CRM implementation specification.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-static";

function textFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textFromNode((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

function slugify(node: React.ReactNode) {
  return textFromNode(node)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const components: Components = {
  h1: ({ children }) => <h1 id={slugify(children)} className="scroll-mt-24 border-b border-white/10 pb-5 pt-5 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">{children}</h1>,
  h2: ({ children }) => <h2 id={slugify(children)} className="scroll-mt-24 border-t border-white/10 pt-12 text-3xl font-black tracking-[-.03em] text-white">{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(children)} className="scroll-mt-24 pt-7 text-xl font-black text-amber-200">{children}</h3>,
  h4: ({ children }) => <h4 className="pt-5 text-base font-black text-white">{children}</h4>,
  p: ({ children }) => <p className="my-4 text-[15px] leading-7 text-slate-300">{children}</p>,
  a: ({ href, children }) => <a href={href} className="font-bold text-amber-300 underline decoration-amber-400/30 underline-offset-4 hover:text-amber-200" target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>,
  strong: ({ children }) => <strong className="font-extrabold text-white">{children}</strong>,
  em: ({ children }) => <em className="text-slate-200">{children}</em>,
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-300 marker:text-amber-400">{children}</ul>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-slate-300 marker:font-black marker:text-amber-400">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-6 rounded-r-2xl border-l-4 border-amber-400 bg-amber-400/[.07] px-5 py-2 text-lg font-bold text-white">{children}</blockquote>,
  hr: () => <hr className="my-12 border-white/10" />,
  code: ({ className, children }) => {
    const block = Boolean(className);
    return block ? <code className="text-sm text-emerald-200">{children}</code> : <code className="rounded bg-white/[.07] px-1.5 py-0.5 text-[.9em] text-emerald-200">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-5 text-sm leading-6 shadow-inner">{children}</pre>,
  table: ({ children }) => <div className="my-7 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[680px] border-collapse text-left text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-white/[.06] text-white">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
  th: ({ children }) => <th className="border-r border-white/10 px-4 py-3 font-black last:border-r-0">{children}</th>,
  td: ({ children }) => <td className="border-r border-white/10 px-4 py-3 leading-6 text-slate-300 last:border-r-0">{children}</td>,
  input: (props) => <input {...props} disabled className="mr-2 accent-amber-400" />,
};

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
              <PromptActions />
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
