import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, ClipboardCheck, ShieldCheck, Users, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "NorAutoMatch Services | Dealer & Salesperson Tools",
  description: "Explore scoped automotive website audits, salesperson tools and evaluation-only Torque pilots.",
  robots: { index: false, follow: false },
};

const email = "norautomatch405@gmail.com";
const offerings = [
  {
    label: "START HERE",
    title: "Dealership Digital Checkup",
    icon: ClipboardCheck,
    audience: "Dealership managers",
    details: "A human-reviewed review of your public website: mobile usability, inventory navigation, vehicle listing accuracy signals, forms and shopper handoffs.",
    output: "A prioritized findings report with screenshots, reproducible issues and a suggested fix order.",
    limitation: "Read-only assessment. No access to CRM, analytics, ad accounts or protected data.",
  },
  {
    label: "INDIVIDUAL TOOLKIT",
    title: "Salesperson Online Presence",
    icon: Video,
    audience: "Individual sales professionals",
    details: "A scoped landing-page/content workflow and optional vehicle-video planning to make your customer journey easier to explain.",
    output: "A shareable plan, demo assets and a clear handoff to your authorized dealership.",
    limitation: "Content production, hosting and posting require separate scope and rights. No unauthorized vehicle listings or lead routing.",
  },
  {
    label: "LIMITED EVALUATION",
    title: "Torque Shopping Assistant Pilot",
    icon: Bot,
    audience: "Dealership teams",
    details: "Evaluate a conversational vehicle-search and VIN-research workflow using authorized public or synthetic inventory.",
    output: "Guided demonstration, issue log, fit/gap findings and pilot-readiness report.",
    limitation: "Experimental: inventory freshness, VIN data and customer journeys are not production-certified. No automated sale or finance action.",
  },
];
const contactHref = (subject: string) =>
  `mailto:${email}?subject=${encodeURIComponent("NorAutoMatch Services — " + subject)}&body=${encodeURIComponent(
    "Hello, I'd like to discuss a scoped evaluation.\n\nBusiness or role:\nBest contact method:\nWhat I'd like to improve:\n\nPlease send the proposed scope, timeline, and written quote."
  )}`;

export default function ServicesPage() {
  return <main className="min-h-screen bg-[#080d13] text-white">
    <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_75%_15%,rgba(245,158,11,.10),transparent_50%)]">
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:py-20">
        <Link href="/" className="text-sm font-bold text-amber-300 hover:text-white">NorAutoMatch <ArrowRight className="inline h-4 w-4" aria-hidden="true" /></Link>
        <p className="mt-10 text-xs font-black uppercase tracking-[.2em] text-emerald-300">Tools for people who sell cars</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Better vehicle shopping starts with a better customer experience.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
          Practical website reviews, salesperson-facing digital tools and supervised AI demonstrations.
          Start with one clearly defined problem—not a giant software contract.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={contactHref("A scoped services conversation")} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-200">
            Ask about a scoped project <ArrowRight size={17}/>
          </a>
          <Link href="/ask-torque" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold hover:bg-white/10">
            See Torque's research workspace
          </Link>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">Private evaluation draft. No posted prices, appointments, payment collection or automated lead submission.</p>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16" aria-labelledby="services-heading">
      <h2 id="services-heading" className="text-3xl font-black tracking-tight">Choose one problem to solve.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Every engagement starts with a written deliverable, permission check and quote. Torque remains an evaluation product until independently accepted.</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {offerings.map(item => {
          const Icon = item.icon;
          return <article key={item.title} className="flex flex-col rounded-3xl border border-white/10 bg-[#111b24] p-6">
            <div className="flex items-center justify-between gap-4"><span className="text-[10px] font-black tracking-[.18em] text-amber-300">{item.label}</span><Icon className="text-emerald-300" size={25}/></div>
            <h3 className="mt-5 text-2xl font-black tracking-tight">{item.title}</h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{item.audience}</p>
            <p className="mt-5 text-sm leading-7 text-slate-200">{item.details}</p>
            <p className="mt-5 text-sm leading-6"><strong className="text-amber-200">Deliverable:</strong> {item.output}</p>
            <p className="mt-4 flex-1 text-xs leading-6 text-slate-400"><strong>Boundary:</strong> {item.limitation}</p>
            <a href={contactHref(item.title)} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/40 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-300/10">
              Request project scope <ArrowRight size={16}/>
            </a>
          </article>;
        })}
      </div>
    </section>
    <section className="border-y border-white/10 bg-[#0e171e]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black">What you get before any commitment</h2>
          <div className="mt-5 space-y-4">
            {["Named scope and acceptance criteria","Confirmed access and marketing permissions","Written quote reviewed against our pricing-floor policy","Human review of every customer-facing claim"].map(text =>
              <p key={text} className="flex items-start gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-300"/>{text}</p>)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-center gap-2"><ShieldCheck className="text-amber-300" size={22}/><h3 className="text-xl font-black">Who handles the car sale?</h3></div>
          <p className="mt-4 text-sm leading-7 text-slate-300">The authorized dealership and its properly authorized personnel handle vehicle availability confirmation, pricing, finance, test drives and sales transactions. NorAutoMatch Services does not promise vehicle inventory, financing or legally permitted referral compensation.</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">Brand assets, dealer inventory integrations and customer information are used only under applicable permissions. The software is not represented as a certified autonomous sales agent.</p>
        </div>
      </div>
    </section>
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-slate-400 sm:px-8">
      <span className="inline-flex items-center gap-2"><Users size={16}/> Built for dealerships and salespeople</span>
      <a href={contactHref("General inquiry")} className="font-bold text-amber-200 hover:text-white">Contact NorAutoMatch Services</a>
    </footer>
  </main>;
}
