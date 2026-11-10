import Link from "next/link";
import { ArrowRight, Bot, Search, ShieldCheck, Video } from "lucide-react";

export const metadata = {
  title: "From MWMM to NorAutoMatch | Explore Your Vehicle Options",
  description: "Continue from Mobile With Matt Mobley's vehicle content to NorAutoMatch's independent shopping and comparison workspace at Orr Nissan West.",
  robots: { index: false, follow: true },
};

/**
 * An intentional handoff, not a second media-brand site or a lead capture.
 * No campaign parameters, personal data or tracking cookies are collected.
 */
export default function MwmmHandoffPage() {
  return (
    <main className="min-h-[72vh] bg-[#070b10] text-white">
      <section className="shell mx-auto max-w-4xl py-12 sm:py-20">
        <div className="rounded-[28px] border border-white/10 bg-white/[.035] p-6 sm:p-10">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[.14em]">
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-sky-200">Mobile With Matt Mobley</span>
            <ArrowRight size={16} className="text-slate-500" aria-hidden="true"/>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-amber-200">NorAutoMatch</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-red-300">Saw the story? Now check the fit.</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">From the video to the vehicle that fits you.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            MWMM brings you the stories, demonstrations and car content. NorAutoMatch helps you research real vehicles, compare equipment, and understand the tradeoffs before deciding what to see in person.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/ask-torque" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black hover:bg-amber-200">
              <Bot size={19}/> Ask Torque about the vehicle <ArrowRight size={17}/>
            </Link>
            <Link href="/find-my-car" className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">
              <Search size={18}/> Find my match <ArrowRight size={17}/>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div className="flex gap-3"><Video className="shrink-0 text-sky-300" size={19}/><p className="text-xs leading-5 text-slate-300"><strong className="text-white">MWMM</strong> creates vehicle content and introduces options.</p></div>
            <div className="flex gap-3"><Bot className="shrink-0 text-amber-300" size={19}/><p className="text-xs leading-5 text-slate-300"><strong className="text-white">Torque</strong> checks listing evidence, price, MPG and fit.</p></div>
            <div className="flex gap-3"><ShieldCheck className="shrink-0 text-emerald-300" size={19}/><p className="text-xs leading-5 text-slate-300"><strong className="text-white">A real salesperson</strong> confirms availability, equipment and next steps.</p></div>
          </div>
          <p className="mt-6 text-xs leading-5 text-slate-400">
            NorAutoMatch is a personal sales experience operating through Orr Nissan West—not a separate dealership or lender. A displayed listing or model specification is not a guarantee of availability, equipment or financing approval. No automatic appointment or inquiry is submitted from this page.
          </p>
        </div>
      </section>
    </main>
  );
}
