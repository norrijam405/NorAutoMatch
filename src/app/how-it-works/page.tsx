import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, CarFront, CheckCircle2, Handshake, Search } from "lucide-react";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "How the Payment-First Car Search Works",
  description: "See how NorAuto Match turns a monthly target into a shortlist, a regional vehicle search, and a direct next step across the OKC metro.",
};

const steps = [
  { icon: Calculator, title: "Start with a real monthly target", text: "Set the payment, down payment or trade equity, and preferred term. The matcher reverses a 7% APR estimate into approximate buying power so you can shop the right price band." },
  { icon: CarFront, title: "Shortlist what fits", text: "Pass or shortlist representative vehicles without losing sight of the full feed. Options dim when they are over budget, excluded by a filter, or passed." },
  { icon: Search, title: "Turn an empty deck into a search", text: "No match is not a dead end. It routes your spec and budget into the Auto Brokerage pipeline so the regional inventory search can begin." },
  { icon: Handshake, title: "Verify, desk, and deliver", text: "Before any commitment, the exact unit, availability, final price, taxes, fees, financing terms, and trade are confirmed through the licensed selling dealership." },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-white/5 py-20 sm:py-28"><div className="shell"><div className="max-w-4xl"><p className="eyebrow">The process</p><h1 className="mt-4 text-5xl font-black tracking-[-.05em] text-white sm:text-7xl">A car search built around your life—not the lot.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">NorAuto Match narrows the math, removes the bad fits, and gives you one direct line through the process.</p><Link href="/#matcher" className="btn-primary mt-8">Run the matcher <ArrowRight size={17} /></Link></div></div></section>
      <section className="py-16 sm:py-24"><div className="shell grid gap-5 lg:grid-cols-2">{steps.map((step, index) => <article key={step.title} className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8"><div className="flex items-center justify-between"><span className="grid size-13 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><step.icon size={25} /></span><span className="text-xs font-black tracking-[.2em] text-slate-600">0{index + 1}</span></div><h2 className="mt-7 text-2xl font-black text-white">{step.title}</h2><p className="mt-3 leading-7 text-slate-400">{step.text}</p></article>)}</div></section>
      <section className="pb-24"><div className="shell"><div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[.06] p-6 sm:p-9"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 size={18} /> Clear expectations</p><h2 className="mt-3 text-3xl font-black text-white">The calculator is a filter—not a finance approval.</h2><p className="mt-3 max-w-3xl leading-7 text-slate-400">Payment estimates exclude taxes, title, registration, dealer fees, optional products, and credit-specific terms. Final paperwork is completed by the licensed dealership. You see the real pencil before you decide.</p></div><a href={`tel:${brand.phoneRaw}`} className="btn-secondary shrink-0">Call {brand.phoneDisplay}</a></div></div></div></section>
    </>
  );
}
