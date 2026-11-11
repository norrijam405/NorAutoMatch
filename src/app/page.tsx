import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Bot, CarFront, CheckCircle2,
  Heart, MessageSquareText, Search, ShieldCheck, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { HomeInventorySpotlight } from "@/components/inventory/home-inventory-spotlight";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

const paths = [
  {
    label: "01 / FIND",
    title: "Describe your perfect car",
    description: "Start with your budget, mileage, body style, and must-haves. No login just to search.",
    href: "/find-my-car",
    action: "Find my car",
    icon: Search,
    color: "text-amber-300",
  },
  {
    label: "02 / RESEARCH",
    title: "Let Torque check the details",
    description: "Ask about an exact VIN, fuel economy, equipment, and tradeoffs. See what is verified and what isn't.",
    href: "/ask-torque",
    action: "Ask Torque",
    icon: Bot,
    color: "text-emerald-300",
  },
  {
    label: "03 / COMPARE",
    title: "Build your dream garage",
    description: "Keep favorites and compare the vehicles that matter before requesting a real conversation.",
    href: "/garage",
    action: "My Garage",
    icon: Heart,
    color: "text-sky-300",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080d13] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_15%,rgba(237,72,65,.12),transparent_45%),radial-gradient(ellipse_at_12%_70%,rgba(245,158,11,.075),transparent_55%)]" />
        <div className="shell relative grid gap-10 pb-14 pt-12 lg:grid-cols-[minmax(0,1.18fr)_minmax(350px,.82fr)] lg:items-center lg:gap-14 lg:pb-20 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.045] px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">
              <ShieldCheck size={14} /> Real research. A real person. Your choice.
            </div>
            <h1 className="mt-6 max-w-3xl text-[clamp(3.15rem,6.8vw,6.15rem)] font-black leading-[.93] tracking-[-.07em]">
              TELL ME THE <span className="text-amber-300">NUMBER.</span>
              <span className="mt-2 block text-[.59em] leading-[1.07] tracking-[-.055em] text-slate-200">I&apos;ll help find the car.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Skip the endless tabs. Tell NorAutoMatch what matters, let Torque check the facts, and take your best options to one accountable salesperson.
            </p>

            <form id="home-match" action="/find-my-car" method="get"
              className="mt-8 rounded-[24px] border border-amber-300/20 bg-[#101921] p-2.5 shadow-[0_22px_90px_rgba(0,0,0,.3)] sm:flex sm:items-center sm:gap-2">
              <label htmlFor="home-vehicle-request" className="sr-only">Describe your next vehicle</label>
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Search size={20} className="shrink-0 text-amber-300" aria-hidden="true" />
                <input id="home-vehicle-request" name="request" required minLength={4} maxLength={1200}
                  className="min-h-14 w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-400 sm:text-base"
                  placeholder="Midsize SUV under $28k, leather, under 35k miles" />
              </div>
              <button type="submit"
                className="mt-2 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-6 py-3 text-sm font-black text-black hover:bg-amber-200 sm:mt-0 sm:w-auto">
                Find my match <ArrowRight size={17} />
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-300" /> No login to search</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-300" /> No invented stock</span>
              <Link href="/ask-torque" className="inline-flex items-center gap-1.5 font-black text-amber-200 hover:text-white">Rather ask a question? Meet Torque <ArrowUpRight size={15} /></Link>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[42px] bg-red-500/[.07] blur-3xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#101922] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-slate-300"><Sparkles size={15} className="text-amber-300" /> Your shopping journey</span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.08] px-3 py-1 text-[10px] font-black text-emerald-200">YOU&apos;RE IN CONTROL</span>
              </div>
              <div className="grid gap-3 p-4 sm:p-5">
                <Link href="/find-my-car" className="group flex items-start gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-4 hover:border-amber-300/50">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-slate-950"><SlidersHorizontal size={21}/></span>
                  <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[.17em] text-amber-300">STEP ONE</span><span className="mt-1 block text-lg font-black">Find what fits</span><span className="mt-1 block text-xs leading-5 text-slate-400">Budget and non-negotiables come first.</span></span>
                  <ArrowUpRight size={17} className="text-slate-500 group-hover:text-amber-200"/>
                </Link>
                <Link href="/ask-torque" className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-emerald-300/40">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-emerald-300/25 bg-emerald-300/[.08] text-emerald-300"><Bot size={22}/></span>
                  <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[.17em] text-emerald-300">STEP TWO</span><span className="mt-1 block text-lg font-black">Investigate with Torque</span><span className="mt-1 block text-xs leading-5 text-slate-400">VIN evidence, MPG, alternatives and unknowns.</span></span>
                  <ArrowUpRight size={17} className="text-slate-500 group-hover:text-emerald-200"/>
                </Link>
                <Link href="/garage" className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-sky-300/40">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-sky-300/25 bg-sky-300/[.08] text-sky-300"><Heart size={21}/></span>
                  <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[.17em] text-sky-300">STEP THREE</span><span className="mt-1 block text-lg font-black">Compare and decide</span><span className="mt-1 block text-xs leading-5 text-slate-400">Garage Battle and human help on your terms.</span></span>
                  <ArrowUpRight size={17} className="text-slate-500 group-hover:text-sky-200"/>
                </Link>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-5 py-4">
                <span className="text-xs text-slate-400">Operating through <strong className="text-white">Orr Nissan West</strong></span>
                <a href={brand.textHref} className="inline-flex shrink-0 items-center gap-2 text-xs font-black text-amber-300 hover:text-white"><MessageSquareText size={15}/> Text a real person</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b121a] py-12 sm:py-16" aria-labelledby="ways-heading">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.19em] text-red-300">Choose your starting point</p>
              <h2 id="ways-heading" className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">One site. Three easy ways in.</h2>
            </div>
            <Link href="/how-it-works" className="inline-flex items-center gap-1 text-xs font-black text-amber-200 hover:text-white">How this works <ArrowRight size={15}/></Link>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {paths.map(path => {
              const Icon = path.icon;
              return <Link key={path.href} href={path.href} className="group flex flex-col rounded-[24px] border border-white/10 bg-white/[.035] p-6 transition hover:-translate-y-0.5 hover:border-amber-300/30">
                <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.2em] text-slate-500">{path.label}</span><Icon size={23} className={path.color}/></div>
                <h3 className="mt-5 text-xl font-black tracking-tight">{path.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{path.description}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-black text-amber-200">{path.action} <ArrowRight size={15}/></span>
              </Link>;
            })}
          </div>
        </div>
      </section>

      <HomeInventorySpotlight />

      <section className="border-t border-white/10 bg-[#10171e] py-12 sm:py-16">
        <div className="shell grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">No perfect match? No dead end.</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-4xl">We can keep looking without lowering your standards.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Torque keeps your requirements clear. If the checked inventory cannot prove a fit, you can ask a salesperson to investigate other authorized sources. We never claim unverified cars are available.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/find-my-car" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950">Start a fresh search <ArrowRight size={17}/></Link>
            <Link href="/ask-torque" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 py-3 text-sm font-black text-white"><Bot size={18}/> Talk it through with Torque</Link>
            <p className="text-center text-[11px] text-slate-500"><CarFront size={13} className="mr-1 inline"/> Vehicle sales and terms are confirmed by the licensed dealership.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
