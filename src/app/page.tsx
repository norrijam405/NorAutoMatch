import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, CarFront, Gauge, MapPin, MessageSquareText, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";
import { RuntimeAutoMatcher } from "@/components/matcher/runtime-auto-matcher";
import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[640px] overflow-hidden border-b border-white/5 sm:min-h-[760px]">
        <Image src="/images/hero-okc.jpg" alt="Dark crossover in Oklahoma City at night" fill priority className="object-cover object-[66%_center]" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#071018_0%,rgba(7,16,24,.95)_30%,rgba(7,16,24,.68)_60%,rgba(7,16,24,.24)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071018] via-transparent to-[#071018]/30" />
        <div className="absolute inset-0 grid-noise opacity-30" />
        <div className="shell relative flex min-h-[640px] items-center py-12 sm:min-h-[760px] sm:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-amber-200 backdrop-blur sm:text-xs"><span className="size-2 animate-pulse-soft rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Car shopping, without the pressure</div>
            <h1 className="mt-6 text-[clamp(3rem,15vw,6.7rem)] font-black leading-[.88] tracking-[-.06em] text-white sm:mt-7">Tell me<br />the <span className="text-amber-300">number.</span></h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-7 text-slate-200 sm:mt-7 sm:text-2xl sm:leading-8">Start with what you can live with. I’ll help narrow the noise, compare the right vehicles, and move toward a verified match.</p>
            <div className="mt-7 grid gap-3 sm:mt-9 sm:flex sm:flex-row">
              <a href="#matcher" className="btn-primary justify-center px-7">Find my match <ArrowDown size={18} /></a>
              <a href={brand.textHref} className="btn-secondary justify-center px-7"><MessageSquareText size={18} /> Text me</a>
            </div>
            <div className="-mx-4 mt-7 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-10 sm:grid sm:max-w-2xl sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
              <Proof icon={<Gauge size={17} />} title="Payment first" text="Start with the monthly." />
              <Proof icon={<SearchCheck size={17} />} title="Verified inventory" text="Only current authorized matches." />
              <Proof icon={<MessageSquareText size={17} />} title="One direct line" text="No pressure maze." />
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/35 lg:flex"><MapPin size={14} /> Oklahoma City, OK</div>
      </section>

      <section className="border-b border-white/5 bg-slate-950/65 py-4 sm:py-5">
        <div className="shell">
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            <JourneyStep number="01" label="Discover" detail="Set your lane" />
            <JourneyStep number="02" label="Shortlist" detail="Keep what fits" />
            <JourneyStep number="03" label="Compare" detail="See the tradeoffs" />
            <JourneyStep number="04" label="Decide" detail="Move on a verified match" />
          </div>
        </div>
      </section>

      <RuntimeAutoMatcher />

      <section className="border-y border-white/5 bg-slate-950/45 py-12 sm:py-20">
        <div className="shell">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-3xl"><p className="eyebrow">The NorAuto Standard</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-white sm:mt-4 sm:text-5xl">Human help.<br />Clean follow-through.</h2></div>
            <p className="max-w-md text-sm leading-6 text-slate-400">Less dealership theater. More context, accountability, and a direct path from first question to next move.</p>
          </div>
          <div className="-mx-4 mt-7 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:px-0 md:pb-0 xl:grid-cols-4">
            <Standard number="01" title="A real match brief" text="Budget, use case, and must-haves become a short list—not a blast of random links." />
            <Standard number="02" title="See the actual unit" text="When a vehicle is verified, focus on the details that matter before making the drive." />
            <Standard number="03" title="Numbers with context" text="Price, assumptions, and next steps stay understandable before the paperwork conversation." />
            <Standard number="04" title="Same direct line" text="Questions do not get orphaned when the process moves forward." />
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-slate-950/20 py-14 sm:py-24">
        <div className="shell">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-12">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow">How NorAuto Match works</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-white sm:mt-4 sm:text-5xl">Less lot.<br />More signal.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-400 sm:mt-5 sm:text-base sm:leading-7">Start with your actual life and budget, then narrow toward a vehicle worth your time.</p>
              <Link href="/how-it-works" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 sm:mt-7">See the full process <ArrowRight size={16} /></Link>
            </div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
              <Step number="01" icon={<Gauge />} title="Set the lane" text="Give me the payment target, cash or trade equity, and the term you can live with." />
              <Step number="02" icon={<CarFront />} title="Match—or pass" text="Shortlist what fits and kill the noise without a sales desk hovering." />
              <Step number="03" icon={<Sparkles />} title="Keep searching" text="If the verified row is wrong, the request can move into the authorized sourcing path." />
              <Step number="04" icon={<ShieldCheck />} title="Verify before action" text="Availability, price, financing assumptions, and delivery get checked before anything is treated as final." />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-24">
        <div className="shell">
          <div className="relative overflow-hidden rounded-[28px] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-slate-900 to-emerald-400/10 px-5 py-10 text-center shadow-glow sm:rounded-[32px] sm:px-12 sm:py-16">
            <div className="absolute inset-0 grid-noise opacity-40" />
            <div className="relative mx-auto max-w-3xl">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300 sm:size-14"><BadgeCheck size={25} /></span>
              <p className="eyebrow mt-5 sm:mt-6">One search. One person.</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-white sm:mt-4 sm:text-5xl">Still looking at 14 tabs?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:mt-5 sm:text-lg sm:leading-8">Send the monthly number and the three things the vehicle has to do. I’ll tell you what fits—or keep the search moving.</p>
              <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:justify-center"><a href="#matcher" className="btn-primary justify-center">Run the matcher <ArrowRight size={17} /></a><a href={brand.textHref} className="btn-secondary justify-center">Text me instead</a></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function JourneyStep({ number, label, detail }: { number: string; label: string; detail: string }) {
  return <div className="min-w-[150px] snap-start rounded-xl border border-white/10 bg-white/[.025] px-3.5 py-3 sm:min-w-0"><div className="flex items-center gap-2"><span className="text-[9px] font-black tracking-[.18em] text-amber-300/60">{number}</span><strong className="text-xs text-white">{label}</strong></div><span className="mt-1 block text-[10px] text-slate-500">{detail}</span></div>;
}

function Standard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="min-w-[78vw] snap-start rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:min-w-[320px] md:min-w-0"><span className="text-[10px] font-black tracking-[.2em] text-amber-300/60">{number}</span><h3 className="mt-3 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>;
}

function Proof({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex min-w-[190px] snap-start items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3.5 backdrop-blur sm:min-w-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-amber-300">{icon}</span><span><strong className="block text-xs font-bold text-white">{title}</strong><span className="mt-0.5 block text-[11px] text-slate-400">{text}</span></span></div>;
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <article className="min-w-[82vw] snap-start rounded-2xl border border-white/10 bg-slate-900/50 p-5 transition hover:border-white/20 sm:min-w-0 sm:rounded-3xl sm:p-6"><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[.2em] text-amber-300/60">{number}</span><span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-amber-300">{icon}</span></div><div className="mt-4"><h3 className="text-xl font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div></article>;
}
