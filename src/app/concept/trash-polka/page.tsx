import Link from "next/link";
import { ArrowRight, BadgeCheck, CarFront, Gauge, Heart, Sparkles, Swords, WalletCards } from "lucide-react";

export default function TrashPolkaConceptPage() {
  return (
    <div className="overflow-hidden bg-[#080b10] text-[#f4efe6]">
      <section className="relative border-b border-white/10 px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(220,38,38,.2),transparent_30%),radial-gradient(circle_at_20%_60%,rgba(245,158,11,.08),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[.34em] text-amber-300">NorAuto Match · Concept Preview</p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.22em] text-white/45">Car shopping, without the pressure</p>
              <h1 className="mt-5 text-[clamp(4.25rem,14vw,10rem)] font-black leading-[.78] tracking-[-.08em] text-white">
                TELL ME<br />THE <span className="relative inline-block"><span className="absolute inset-x-[-.05em] top-[48%] h-[.32em] -rotate-3 bg-red-600/90" /><span className="relative">NUMBER.</span></span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/65">Your budget. Your life. Your match. Start with the number you can live with and let NorAuto cut through the noise.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#swipe" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black">Start my match <ArrowRight size={17} /></a>
                <a href="#garage" className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm font-black text-white">Browse the concept</a>
              </div>
            </div>
            <div className="relative min-h-[320px] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,#111826_0%,#0b1018_50%,#190a0d_100%)] p-6 shadow-2xl sm:min-h-[420px] sm:p-9">
              <div className="absolute -right-16 top-12 h-48 w-72 rotate-[-12deg] border-[16px] border-red-600/70" />
              <div className="absolute right-10 top-10 text-[7rem] font-black leading-none text-white/[.035] sm:text-[10rem]">01</div>
              <div className="relative flex h-full min-h-[280px] flex-col justify-between sm:min-h-[350px]">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[.2em] text-white/40"><span>Personal buying dossier</span><span className="text-red-400">Signal / 01</span></div>
                <div>
                  <p className="max-w-xs text-4xl font-black leading-none tracking-[-.05em] text-white sm:text-6xl">A car search with an actual point of view.</p>
                  <div className="mt-7 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.16em]"><span className="bg-red-600 px-3 py-2 text-white">AWD</span><span className="border border-amber-300/40 px-3 py-2 text-amber-200">$550 lane</span><span className="border border-white/15 px-3 py-2 text-white/70">Cargo +</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="swipe" className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Discover</p>
              <h2 className="mt-3 text-5xl font-black leading-[.9] tracking-[-.06em] text-white sm:text-7xl">SWIPE.<br />REACT.<br /><span className="text-red-500">LEARN.</span></h2>
              <p className="mt-5 max-w-sm leading-7 text-white/55">The product stays clean where the interaction matters. The attitude shows up in the transitions, marks, and feedback.</p>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/[.035] p-4 sm:p-6">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101722]">
                <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#233248,#111722_58%,#311014)]">
                  <div className="absolute inset-0 grid place-items-center"><CarFront className="size-24 text-white/20 sm:size-32" /></div>
                  <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-black tracking-[.2em] text-white/60">02 / 08</div>
                  <div className="absolute bottom-4 right-4 rotate-[-8deg] bg-red-600 px-4 py-2 text-xl font-black text-white shadow-xl">KEEP</div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Demo vehicle</p><h3 className="mt-2 text-3xl font-black tracking-[-.04em] text-white">Midsize AWD SUV</h3></div><p className="text-right text-sm font-black text-white/60">Strong fit<br /><span className="text-amber-300">88%</span></p></div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold"><button className="min-h-12 rounded-2xl border border-white/10 bg-black/30 text-white/65">Pass</button><button className="min-h-12 rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">Maybe</button><button className="min-h-12 rounded-2xl bg-red-600 text-white">Like</button></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#efe9de] px-5 py-16 text-[#101114] sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative">
              <div className="absolute -left-8 top-10 h-5 w-56 -rotate-6 bg-red-600" />
              <p className="relative text-[10px] font-black uppercase tracking-[.28em] text-red-700">Your preference profile</p>
              <h2 className="relative mt-3 text-6xl font-black leading-[.78] tracking-[-.075em] sm:text-8xl">YOUR<br />MATCH<br />DNA</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Signal title="AWD" note="Strong signal" value="92" red />
              <Signal title="Midsize SUV" note="5 of 7 likes" value="86" />
              <Signal title="Cargo" note="High priority" value="78" />
              <Signal title="Payment" note="Under target" value="74" red />
            </div>
          </div>
          <div className="mt-10 border-l-4 border-red-600 pl-5 text-lg font-bold leading-8 sm:max-w-3xl">You consistently favored midsize SUVs with AWD, useful cargo space, and stronger road feel while staying near your monthly target.</div>
        </div>
      </section>

      <section id="garage" className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Shortlist</p><h2 className="mt-2 text-5xl font-black tracking-[-.06em] text-white sm:text-7xl">YOUR GARAGE</h2></div><span className="w-fit rotate-[-3deg] bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-[.15em] text-white">3 survivors</span></div>
          <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-3">
            {["Rogue", "CR-V", "CX-50"].map((name, i) => <div key={name} className="min-w-[78vw] snap-start rounded-[28px] border border-white/10 bg-white/[.035] p-4 sm:min-w-[340px]"><div className="grid aspect-[4/3] place-items-center rounded-2xl bg-[linear-gradient(135deg,#1c2737,#101722)]"><CarFront className="size-20 text-white/20" /></div><p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-white/35">Demo shortlist</p><h3 className="mt-1 text-2xl font-black text-white">{name}</h3><p className="mt-2 text-sm text-white/50">{88 - i * 4}% match · strong utility signal</p></div>)}
          </div>
          <button className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-black text-white"><Swords size={18} /> Start a Garage Battle</button>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1118] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">Head to head</p><div className="mt-5 flex items-center justify-center gap-4 sm:gap-8"><h2 className="text-4xl font-black tracking-[-.06em] text-white sm:text-7xl">ROGUE</h2><span className="rotate-[-8deg] bg-red-600 px-4 py-2 text-2xl font-black text-white sm:text-4xl">VS</span><h2 className="text-4xl font-black tracking-[-.06em] text-white sm:text-7xl">CR-V</h2></div></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2"><BattleCard title="Rogue" wins={["Value", "Available features", "AWD confidence"]} /><BattleCard title="CR-V" wins={["Efficiency", "Cargo", "Resale history"]} /></div>
          <p className="mt-6 text-center text-sm font-bold text-white/45">No universal winner. This is about the better fit for your priorities.</p>
        </div>
      </section>

      <section className="bg-[#efe9de] px-5 py-16 text-[#101114] sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div><WalletCards className="size-10 text-amber-600" /><p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-amber-700">Money lane</p><h2 className="mt-2 text-5xl font-black leading-[.9] tracking-[-.06em] sm:text-7xl">WHAT NUMBER FEELS RIGHT?</h2><p className="mt-5 max-w-md leading-7 text-black/60">The expressive styling backs off when the numbers matter. Calm, clear, useful.</p></div>
          <div className="grid gap-3 rounded-[30px] border border-black/10 bg-white/55 p-5 sm:p-7"><MoneyRow label="Target payment" value="$500/mo" /><MoneyRow label="Down payment" value="$3,000" /><MoneyRow label="Trade equity" value="$4,500" /><MoneyRow label="Term" value="72 months" /><div className="mt-2 rounded-2xl bg-black px-5 py-4 text-white"><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Estimated buying lane</p><p className="mt-2 text-2xl font-black">8 ideas → 4 realistic matches</p></div></div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-400">Trusted state</p><h2 className="mt-3 max-w-4xl text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">MATCHES YOU CAN ACTUALLY SHOP</h2>
          <div className="mt-7 rounded-[28px] border border-emerald-400/20 bg-emerald-400/[.05] p-6 sm:p-8"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><BadgeCheck /></span><div><h3 className="text-xl font-black text-white">No verified match right now.</h3><p className="mt-2 max-w-2xl leading-7 text-white/55">Your preferences stay useful. We can keep searching without pretending stale inventory is available.</p><div className="mt-5 flex flex-wrap gap-3"><button className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-black text-white">Keep searching</button><button className="min-h-11 rounded-full bg-white px-5 text-sm font-black text-black">Find one for me</button></div></div></div></div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 bg-black px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="absolute -right-20 top-10 h-8 w-[520px] rotate-[-8deg] bg-red-600/90" />
        <div className="relative mx-auto max-w-6xl"><p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">Final hit</p><h2 className="mt-4 max-w-4xl text-6xl font-black leading-[.8] tracking-[-.075em] text-white sm:text-8xl">STOP SHOPPING<br /><span className="text-red-500">14 TABS.</span></h2><p className="mt-6 max-w-xl text-lg leading-8 text-white/55">Tell NorAuto what matters. Let the noise die.</p><Link href="/" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black">Back to live NorAuto <ArrowRight size={17} /></Link></div>
      </section>
    </div>
  );
}

function Signal({ title, note, value, red = false }: { title: string; note: string; value: string; red?: boolean }) {
  return <div className={`border-2 p-5 ${red ? "border-red-600 bg-red-600 text-white" : "border-black/15 bg-white/60"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-2xl font-black uppercase tracking-[-.04em]">{title}</p><p className={`mt-1 text-xs font-bold uppercase tracking-[.12em] ${red ? "text-white/65" : "text-black/45"}`}>{note}</p></div><span className="text-4xl font-black">{value}</span></div></div>;
}

function BattleCard({ title, wins }: { title: string; wins: string[] }) {
  return <div className="rounded-[28px] border border-white/10 bg-white/[.035] p-6"><p className="text-2xl font-black text-white">{title}</p><p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Your edge</p><div className="mt-3 grid gap-2">{wins.map((win) => <div key={win} className="flex items-center gap-3 border-b border-white/10 py-3 text-sm font-bold text-white/65"><Sparkles size={15} className="text-red-400" />{win}</div>)}</div></div>;
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/60 px-4 py-4"><span className="text-sm font-bold text-black/55">{label}</span><strong className="text-lg text-black">{value}</strong></div>;
}
