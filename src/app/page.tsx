import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, CarFront, Gauge, Heart, MessageSquareText, SearchCheck, ShieldCheck, Swords } from "lucide-react";
import { RuntimeAutoMatcher } from "@/components/matcher/runtime-auto-matcher";
import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-[#05080d]">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(255,255,255,.08),transparent_24%),radial-gradient(circle_at_80%_68%,rgba(239,68,68,.14),transparent_18%),linear-gradient(118deg,#05080d_0%,#08111b_42%,#0b1420_67%,#05080d_100%)]" />
          <div className="absolute -right-24 top-[19%] h-1.5 w-[44rem] rotate-[-10deg] bg-gradient-to-r from-transparent via-white/65 to-transparent blur-[2px]" />
          <div className="absolute -right-16 top-[25%] h-1 w-[38rem] rotate-[-10deg] bg-gradient-to-r from-transparent via-amber-200/45 to-transparent blur-[3px]" />
          <div className="absolute -right-32 bottom-[24%] h-2 w-[46rem] rotate-[7deg] bg-gradient-to-r from-transparent via-red-500/35 to-transparent blur-[5px]" />
          <div className="absolute right-[7%] top-[26%] size-32 rounded-full bg-white/[.035] blur-2xl" />
          <div className="absolute right-[15%] bottom-[17%] size-24 rounded-full bg-red-500/[.08] blur-2xl" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#05080d_0%,rgba(5,8,13,.95)_43%,rgba(5,8,13,.35)_78%,rgba(5,8,13,.72)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05080d] via-transparent to-[#05080d]/40" />
        </div>
        <div className="absolute -left-20 top-[42%] h-7 w-72 -rotate-6 bg-red-600/90 sm:w-[28rem]" />
        <div className="absolute right-[-7rem] top-28 hidden h-8 w-[28rem] rotate-[-8deg] bg-red-600/60 lg:block" />
        <div className="shell relative flex min-h-[610px] items-center py-12 sm:min-h-[720px] sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-white/55 sm:text-xs">
              <span className="h-[2px] w-8 bg-red-500" /> Car shopping, without the pressure
            </div>
            <h1 className="mt-6 text-[clamp(3.9rem,16vw,8rem)] font-black leading-[.78] tracking-[-.075em] text-white">
              TELL ME<br />THE <span className="relative inline-block italic text-white"><span className="absolute inset-x-[-.03em] top-[48%] h-[.28em] -rotate-2 bg-red-600" /><span className="relative">NUMBER.</span></span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-7 text-slate-200 sm:text-xl sm:leading-8">Your budget. Your life. Your match. Start with the number you can live with and let NorAuto cut through the noise.</p>
            <div className="mt-8 grid gap-3 sm:flex">
              <a href="#matcher" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-7 text-sm font-black text-black shadow-[0_0_28px_rgba(252,211,77,.14)]">Start my match <ArrowDown size={18} /></a>
              <a href={brand.textHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/25 px-7 text-sm font-black text-white backdrop-blur"><MessageSquareText size={18} /> Ask me directly</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.16em]">
              <span className="bg-red-600 px-3 py-2 text-white">Real fit first</span>
              <span className="border border-amber-300/35 bg-black/30 px-3 py-2 text-amber-200">Verified inventory</span>
              <span className="border border-white/15 bg-black/30 px-3 py-2 text-white/70">No pressure maze</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080c12] py-4">
        <div className="shell">
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            <Journey icon={<SearchCheck size={18} />} label="Discover" active />
            <Journey icon={<Heart size={18} />} label="Shortlist" />
            <Journey icon={<Swords size={18} />} label="Compare" />
            <Journey icon={<BadgeCheck size={18} />} label="Decide" />
          </div>
        </div>
      </section>

      <section className="bg-[#070b10] pt-12 sm:pt-20">
        <div className="shell">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.32em] text-red-400">SwipeMatch / Discover</p>
              <h2 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.055em] text-white sm:text-6xl">DISCOVER<br />YOUR MATCH <span className="text-red-500">—</span></h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">The cards below come from NorAuto Match’s existing inventory runtime. When authorized live inventory passes verification, you see real units. When it doesn’t, NorAuto says so instead of making one up.</p>
          </div>
        </div>
      </section>

      <div className="bg-[#070b10]">
        <RuntimeAutoMatcher />
      </div>

      <section className="border-y border-white/10 bg-[#eee8dc] py-10 text-[#0c1118] sm:py-14">
        <div className="shell grid gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div className="relative">
            <div className="absolute -left-6 top-12 h-4 w-44 -rotate-6 bg-red-600" />
            <p className="relative text-[10px] font-black uppercase tracking-[.3em] text-red-700">Built around you</p>
            <h2 className="relative mt-3 text-5xl font-black leading-[.8] tracking-[-.07em] sm:text-7xl">YOUR<br />MATCH<br />DNA</h2>
          </div>
          <div>
            <p className="max-w-2xl text-base font-bold leading-7 sm:text-lg sm:leading-8">Your likes, passes, budget lane, body-style preferences, utility needs, and must-haves should become a personal buying profile — not just another search filter.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Signal icon={<CarFront size={20} />} label="Body style" />
              <Signal icon={<Gauge size={20} />} label="Performance" />
              <Signal icon={<ShieldCheck size={20} />} label="Practical fit" />
              <Signal icon={<BadgeCheck size={20} />} label="Budget lane" />
            </div>
            <p className="mt-4 border-l-4 border-red-600 pl-4 text-sm leading-6 text-black/60">This layer becomes personalized as the interaction state is wired in. Until then, the site does not pretend it learned preferences it has not actually observed.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#070b10] py-14 sm:py-20">
        <div className="shell">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Shortlist</p><h2 className="mt-2 text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">YOUR GARAGE <span className="text-red-500">—</span></h2></div>
            <p className="max-w-md text-sm leading-6 text-slate-400">The next product layer: keep the real units you like, compare them without opening fourteen tabs, and carry the shortlist into the buying conversation.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard number="01" title="Save the survivors" text="Keep real verified units or vehicle families that earned another look." />
            <FeatureCard number="02" title="Garage Battle" text="Compare the tradeoffs around your priorities instead of declaring one universal winner." red />
            <FeatureCard number="03" title="Take the next step" text="Request a test drive or send a Buyer Brief only after the product has already helped you." />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b1017] py-14 sm:py-20">
        <div className="shell grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Planning context</p>
            <h2 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.055em] text-white sm:text-6xl">YOUR NUMBER<br />STARTS THE CONVERSATION.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">Your comfort target helps narrow the field. NorAuto does not turn that preference into a promised payment or approval.</p>
          </div>
          <div className="rounded-[28px] border border-amber-300/20 bg-white/[.035] p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Money label="Comfort target" value="Your number" />
              <Money label="Down / trade" value="Your context" />
              <Money label="Term" value="Your preference" />
              <Money label="Exact VIN" value="Required later" />
            </div>
            <div className="mt-4 rounded-2xl border border-amber-300/20 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Not a payment quote</p><p className="mt-2 text-sm leading-6 text-slate-300">Actual payment figures depend on the exact vehicle/VIN and selling figures, approved credit and lender terms, down payment, trade position, taxes, fees, incentives, optional products, and other deal-specific inputs.</p></div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-16 sm:py-24">
        <div className="absolute -right-24 top-12 h-8 w-[34rem] rotate-[-8deg] bg-red-600/90" />
        <div className="shell relative">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Final hit</p>
          <h2 className="mt-4 text-5xl font-black leading-[.82] tracking-[-.07em] text-white sm:text-8xl">STOP SHOPPING<br /><span className="text-red-500">14 TABS.</span></h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">Real guidance. Better drives. A car search that remembers there is a person on the other side of the screen.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#matcher" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black">Find my match <ArrowRight size={17} /></a><Link href="/how-it-works" className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm font-black text-white">How it works</Link></div>
        </div>
      </section>
    </>
  );
}

function Journey({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return <div className={`flex min-w-[145px] snap-start items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-black ${active ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-white/10 bg-white/[.02] text-white/60"}`}>{icon}{label}</div>;
}

function Signal({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="border-2 border-black/10 bg-white/60 p-4"><span className="text-amber-700">{icon}</span><p className="mt-3 text-sm font-black">{label}</p></div>;
}

function FeatureCard({ number, title, text, red = false }: { number: string; title: string; text: string; red?: boolean }) {
  return <article className={`rounded-[24px] border p-5 ${red ? "border-red-500/40 bg-red-600 text-white" : "border-white/10 bg-white/[.035] text-white"}`}><span className={`text-[10px] font-black tracking-[.2em] ${red ? "text-white/60" : "text-amber-300/60"}`}>{number}</span><h3 className="mt-4 text-xl font-black">{title}</h3><p className={`mt-2 text-sm leading-6 ${red ? "text-white/80" : "text-slate-400"}`}>{text}</p></article>;
}

function Money({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">{label}</p><p className="mt-2 text-sm font-black text-white">{value}</p></div>;
}
