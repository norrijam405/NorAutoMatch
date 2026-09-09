import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, CarFront, Gauge, MapPin, MessageSquareText, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";
import { RuntimeAutoMatcher } from "@/components/matcher/runtime-auto-matcher";
import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[760px] overflow-hidden border-b border-white/5 sm:min-h-[820px]">
        <Image src="/images/hero-okc.jpg" alt="Dark crossover in Oklahoma City at night" fill priority className="object-cover object-[64%_center]" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#071018_0%,rgba(7,16,24,.95)_30%,rgba(7,16,24,.65)_58%,rgba(7,16,24,.2)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071018] via-transparent to-[#071018]/30" />
        <div className="absolute inset-0 grid-noise opacity-30" />
        <div className="shell relative flex min-h-[760px] items-center py-20 sm:min-h-[820px]">
          <div className="max-w-3xl pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 backdrop-blur"><span className="size-2 animate-pulse-soft rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Your direct shopping line at Orr Nissan West</div>
            <h1 className="mt-7 text-[clamp(3.4rem,8.5vw,7.4rem)] font-black leading-[.86] tracking-[-.065em] text-white">Tell me<br />the <span className="text-amber-300">number.</span></h1>
            <p className="mt-7 max-w-xl text-xl font-medium leading-8 text-slate-200 sm:text-2xl">I’ll find the car. Payment-first matching, direct communication, and a cleaner path from search to driveway.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#matcher" className="btn-primary px-7">Build my match <ArrowDown size={18} /></a>
              <a href={brand.textHref} className="btn-secondary px-7"><MessageSquareText size={18} /> Text {brand.phoneDisplay}</a>
            </div>
            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Proof icon={<Gauge size={17} />} title="Payment first" text="Start with the monthly." />
              <Proof icon={<SearchCheck size={17} />} title="Network search" text="Not stuck with one row." />
              <Proof icon={<MessageSquareText size={17} />} title="One direct line" text="You get me, not a queue." />
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/35 lg:flex"><MapPin size={14} /> Oklahoma City, OK</div>
      </section>

      <RuntimeAutoMatcher />

      <section className="border-y border-white/5 bg-slate-950/45 py-16 sm:py-20">
        <div className="shell">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl"><p className="eyebrow">The NorAuto Standard</p><h2 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Country-store humanity.<br />Luxury-level follow-through.</h2></div>
            <p className="max-w-md text-sm leading-6 text-slate-400">Big stores win on inventory. NorAuto Match wins by making one person accountable from the first text through delivery—and after it.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Standard number="01" title="A real match brief" text="Budget, use case, and must-haves become a short list—not a blast of random links." />
            <Standard number="02" title="Video before the drive" text="See the actual unit and the details that matter before you cross the metro." />
            <Standard number="03" title="Numbers with context" text="Get the vehicle price, assumptions, and next steps explained before the paperwork conversation." />
            <Standard number="04" title="Follow-through after delivery" text="Questions do not get orphaned when the keys change hands. You keep the same direct line." />
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-950/20 py-20 sm:py-28">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow">How NorAuto Match works</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Less lot.<br />More signal.</h2>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-400">The old process starts with what somebody wants to move. This one starts with what you can actually live with.</p>
              <Link href="/how-it-works" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200">See the full process <ArrowRight size={16} /></Link>
            </div>
            <div className="grid gap-4">
              <Step number="01" icon={<Gauge />} title="Set the lane" text="Give me the target payment, down payment or trade equity, and the term you are comfortable with." />
              <Step number="02" icon={<CarFront />} title="Match—or pass" text="See which vehicles fit the math. Shortlist the right ones and kill the noise without a sales desk hovering." />
              <Step number="03" icon={<Sparkles />} title="Open the approved network" text="If the current row is wrong, the search does not end. Your request routes to vehicle sourcing through Orr Nissan West and its approved inventory channels." />
              <Step number="04" icon={<ShieldCheck />} title="Verify and desk it" text="We confirm the actual unit, selling price, taxes, fees, financing, and delivery through Orr Nissan West or the approved licensed selling dealership." />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="shell">
          <div className="relative overflow-hidden rounded-[32px] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-slate-900 to-emerald-400/10 px-6 py-12 text-center shadow-glow sm:px-12 sm:py-16">
            <div className="absolute inset-0 grid-noise opacity-40" />
            <div className="relative mx-auto max-w-3xl">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><BadgeCheck size={27} /></span>
              <p className="eyebrow mt-6">One search. One person.</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Still looking at 14 tabs?</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Send the monthly number and the three things the vehicle has to do. I’ll tell you what fits—or start the hunt.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href="#matcher" className="btn-primary">Run the matcher <ArrowRight size={17} /></a><a href={brand.textHref} className="btn-secondary">Text me instead</a></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Standard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><span className="text-[10px] font-black tracking-[.2em] text-amber-300/60">{number}</span><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>;
}

function Proof({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3.5 backdrop-blur"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-amber-300">{icon}</span><span><strong className="block text-xs font-bold text-white">{title}</strong><span className="mt-0.5 block text-[11px] text-slate-400">{text}</span></span></div>;
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <article className="group grid gap-5 rounded-3xl border border-white/10 bg-slate-900/50 p-6 transition hover:border-white/20 sm:grid-cols-[70px_1fr] sm:p-8"><div className="flex items-center justify-between sm:block"><span className="text-xs font-black tracking-[.2em] text-amber-300/60">{number}</span><span className="mt-4 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950">{icon}</span></div><div><h3 className="text-2xl font-black text-white">{title}</h3><p className="mt-3 max-w-2xl leading-7 text-slate-400">{text}</p></div></article>;
}
