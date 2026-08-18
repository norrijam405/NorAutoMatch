import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function MarkdownContent({ markdown }: { markdown: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>;
}
