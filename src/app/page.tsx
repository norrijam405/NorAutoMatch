import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, Heart, MessageSquareText, SearchCheck, Swords } from "lucide-react";
import { HomeHeroSwipeShell } from "@/components/inventory/home-hero-swipe-shell";
import { HomeInventorySpotlight } from "@/components/inventory/home-inventory-spotlight";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-[#05080d]">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(255,255,255,.08),transparent_24%),radial-gradient(circle_at_80%_68%,rgba(239,68,68,.14),transparent_18%),linear-gradient(118deg,#05080d_0%,#08111b_42%,#0b1420_67%,#05080d_100%)]" />
          <div className="absolute -right-24 top-[19%] h-1.5 w-[44rem] rotate-[-10deg] bg-gradient-to-r from-transparent via-white/65 to-transparent blur-[2px]" />
          <div className="absolute -right-32 bottom-[24%] h-2 w-[46rem] rotate-[7deg] bg-gradient-to-r from-transparent via-red-500/35 to-transparent blur-[5px]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#05080d_0%,rgba(5,8,13,.95)_43%,rgba(5,8,13,.35)_78%,rgba(5,8,13,.72)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05080d] via-transparent to-[#05080d]/40" />
        </div>
        <div className="absolute -left-20 top-[42%] h-7 w-72 -rotate-6 bg-red-600/90 sm:w-[28rem]" />
        <div className="shell relative grid min-h-[650px] items-center gap-10 py-12 sm:min-h-[760px] sm:py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-white/55 sm:text-xs"><span className="h-[2px] w-8 bg-red-500" /> Car shopping, without the pressure</div>
            <h1 className="mt-6 text-[clamp(3.8rem,11vw,8rem)] font-black leading-[.78] tracking-[-.075em] text-white">TELL ME<br />THE <span className="relative inline-block italic text-white"><span className="absolute inset-x-[-.03em] top-[48%] h-[.28em] -rotate-2 bg-red-600" /><span className="relative">NUMBER.</span></span></h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-7 text-slate-200 sm:text-xl sm:leading-8">Start with the budget or payment range that feels comfortable to you, then react to real VINs. Your number is a shopping preference — not a dealer quote, approval, or promise.</p>
            <div className="mt-8 grid gap-3 sm:flex">
              <a href="#matcher" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-7 text-sm font-black text-black shadow-[0_0_28px_rgba(252,211,77,.14)]">Start my match <ArrowDown size={18} /></a>
              <a href={brand.textHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/25 px-7 text-sm font-black text-white backdrop-blur"><MessageSquareText size={18} /> Ask me directly</a>
            </div>
            <p className="mt-6 max-w-xl text-xs leading-5 text-white/45">NorAutoMatch helps organize your search and request follow-up. The dealership and, when applicable, the lender determine and confirm final price, payment, trade value, financing, incentives, availability, and other deal terms.</p>
          </div>
          <div className="relative z-10"><HomeHeroSwipeShell /></div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080c12] py-5">
        <div className="shell flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-black text-white/55">
          <Journey icon={<SearchCheck size={17} />} label="Discover" active />
          <span className="text-white/20">→</span>
          <Journey icon={<Heart size={17} />} label="Shortlist" />
          <span className="text-white/20">→</span>
          <Journey icon={<Swords size={17} />} label="Compare" />
          <span className="text-white/20">→</span>
          <Journey icon={<BadgeCheck size={17} />} label="Decide with the dealer" />
        </div>
      </section>

      <section className="bg-[#070b10] pt-12 sm:pt-20"><div className="shell"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.32em] text-red-400">SwipeMatch / Discover</p><h2 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.055em] text-white sm:text-6xl">DISCOVER<br />YOUR MATCH <span className="text-red-500">—</span></h2></div><p className="max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">React to real inventory, search naturally, save favorites, and compare tradeoffs. NorAutoMatch helps with shopping decisions; it does not set or approve the dealership&apos;s final deal.</p></div></div></section>

      <HomeInventorySpotlight />

      <section className="border-y border-white/10 bg-[#eee8dc] py-12 text-[#0c1118] sm:py-16">
        <div className="shell grid gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div className="relative"><div className="absolute -left-6 top-12 h-4 w-44 -rotate-6 bg-red-600" /><p className="relative text-[10px] font-black uppercase tracking-[.3em] text-red-700">Built around you</p><h2 className="relative mt-3 text-5xl font-black leading-[.8] tracking-[-.07em] sm:text-7xl">YOUR<br />MATCH<br />DNA</h2></div>
          <div>
            <p className="max-w-2xl text-base font-bold leading-7 sm:text-lg sm:leading-8">Your likes and passes can help the game learn what to show next: body style, practical needs, budget comfort, and the features you keep reacting to.</p>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-black/55">Right now that learning is session-based. NorAutoMatch does not claim a durable preference profile until saved preference history is actually wired and verified.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#070b10] py-14 sm:py-20">
        <div className="shell grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Shortlist</p><h2 className="mt-2 text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">YOUR GARAGE <span className="text-red-500">—</span></h2><p className="mt-4 max-w-md text-sm leading-6 text-slate-400">Save the real units you like, compare tradeoffs, and bring a cleaner shortlist into the dealership conversation.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href="/garage" className="inline-flex min-h-12 items-center rounded-full bg-amber-300 px-6 text-sm font-black text-black">Open my Garage</Link>
            <Link href="/inventory" className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 text-sm font-black text-white">Compare inventory</Link>
            <a href={brand.textHref} className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 text-sm font-black text-white">Ask about a vehicle</a>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b1017] py-14 sm:py-20">
        <div className="shell grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Planning context</p><h2 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.055em] text-white sm:text-6xl">YOUR NUMBER<br />STARTS THE CONVERSATION.</h2><p className="mt-4 max-w-md text-sm leading-6 text-slate-400">Use your comfort range to narrow the field and decide which VINs are worth discussing. It is not a payment quote or an offer from the dealership.</p></div>
          <div className="border-l-2 border-amber-300/40 pl-5 sm:pl-7">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Before any final numbers</p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200">Final figures can depend on the exact VIN, dealer selling terms, credit and lender terms, down payment, trade appraisal, taxes, fees, incentives, optional products, and other deal-specific inputs.</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">NorAutoMatch can help you organize the information and ask the right questions. It does not authorize, guarantee, or bind the dealership or a lender to a price, payment, trade value, approval, or other term.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-16 sm:py-24"><div className="absolute -right-24 top-12 h-8 w-[34rem] rotate-[-8deg] bg-red-600/90" /><div className="shell relative"><p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Final hit</p><h2 className="mt-4 text-5xl font-black leading-[.82] tracking-[-.07em] text-white sm:text-8xl">STOP SHOPPING<br /><span className="text-red-500">14 TABS.</span></h2><p className="mt-6 max-w-xl text-lg leading-8 text-white/55">Real inventory. Better organization. A car search that helps you walk into the next conversation knowing what matters to you.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#matcher" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black">Find my match <ArrowRight size={17} /></a><Link href="/inventory" className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm font-black text-white">Browse inventory</Link></div></div></section>
    </>
  );
}

function Journey({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return <span className={`inline-flex items-center gap-2 ${active ? "text-red-300" : "text-white/55"}`}>{icon}{label}</span>;
}
