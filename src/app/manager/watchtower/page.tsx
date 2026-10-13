import type { Metadata } from "next";
import Link from "next/link";
import { Binoculars, Bot, CarFront, Radar, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { torqueInventorySources } from "@/lib/torque-inventory-sources";
import { industryScoutSources } from "@/lib/industry-scout";

export const metadata: Metadata = {
  title: "Torque Watchtower",
  description: "Restricted NorAuto Match sourcing and inventory intelligence surface.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TorqueWatchtowerPage() {
  await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/watchtower");

  const local = torqueInventorySources.filter((source) => source.scope === "LOCAL_STORE");
  const network = torqueInventorySources.filter((source) => source.scope === "ORR_GROUP" || source.scope === "ORR_NISSAN_SIBLING");
  const national = torqueInventorySources.filter((source) => source.scope === "NISSAN_NATIONAL");

  return (
    <main className="min-h-screen bg-[#070b10] py-10 sm:py-14">
      <div className="shell">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">Restricted operator surface</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-.06em] text-white sm:text-7xl">TORQUE<br />WATCHTOWER</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Vehicle Hunt intelligence for fresh ups, active customers, sourcing opportunities, MatchDNA, and follow-up. Customer-facing Torque stays simple; this side keeps the operational detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/manager/follow-up" className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white">Follow-up desk</Link>
            <Link href="/inventory" className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-black">Verified inventory</Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={<CarFront size={20} />} title="Our inventory" value={String(local.length)} detail="Primary verified customer-facing scope." />
          <SummaryCard icon={<Radar size={20} />} title="Orr sourcing layers" value={String(network.length)} detail="Group and sibling Nissan discovery sources." />
          <SummaryCard icon={<Binoculars size={20} />} title="National Nissan layers" value={String(national.length)} detail="New-Nissan discovery and dealer resolution." />
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-black"><Bot size={21} /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">Fresh Up mode</p>
                <h2 className="mt-2 text-3xl font-black text-white">Tell Torque once.</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Capture the exact vehicle request, mark must-haves versus preferences, search the available inventory layers, and preserve the result as one Vehicle Hunt instead of retyping the customer need in multiple systems.
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Example Hunt</p>
              <p className="mt-3 text-lg font-black text-white">2026 Pathfinder · Baltic Teal · Chestnut · 4WD</p>
              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <p>✓ Explicit customer spec retained</p>
                <p>✓ Local → Orr → national search order</p>
                <p>✓ MatchDNA can enrich, not override</p>
                <p>✓ Human verification before sourcing promise</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
            <div className="flex items-center gap-2 text-emerald-300"><ShieldCheck size={18} /><span className="text-xs font-black uppercase tracking-[.16em]">Truth boundary</span></div>
            <h2 className="mt-4 text-3xl font-black text-white">Internal detail. Cleaner customer language.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Watchtower may show the exact store, VIN, source timestamp, fit reasons, compromises, and verification state. Customer-facing Torque focuses on whether we can help obtain the right vehicle without pretending a transfer, reservation, financing result, or arrival time is already confirmed.
            </p>
            <div className="mt-6 space-y-3 text-xs leading-5 text-slate-500">
              <p>OBSERVED → a source currently reports the VIN.</p>
              <p>VERIFIED → the governed source check supports the claim.</p>
              <p>HUMAN VERIFY → manager or salesperson action is still required.</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">Connected search registry</p><h2 className="mt-2 text-3xl font-black text-white">Inventory intelligence layers</h2></div>
            <span className="hidden text-xs text-slate-600 sm:inline">Discovery does not equal transfer authority.</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {torqueInventorySources.map((source) => (
              <article key={source.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">{source.scope.replaceAll("_", " ")}</p><h3 className="mt-1 font-black text-white">{source.label}</h3></div>
                  <span className={source.enabled ? "rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-300" : "rounded-full bg-white/5 px-2 py-1 text-[9px] font-black text-slate-500"}>{source.enabled ? "REGISTERED" : "OFF"}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">{source.conditionPolicy.replaceAll("_", " ")} · {source.makePolicy.replaceAll("_", " ")} · {source.customerAuthority.replaceAll("_", " ")}</p>
              </article>
            ))}
          </div>
        </section>


        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Industry Scout</p>
              <h2 className="mt-2 text-3xl font-black text-white">What changed that matters to the floor?</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Incentives, launches, trim changes, competitive moves, supply, pricing, sales, demand, EV/hybrid shifts, and safety changes are tracked with source authority attached. Customer-safe Torque claims require primary or corroborated evidence.
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-300">
              {industryScoutSources.filter((source) => source.enabled).length} governed sources
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {industryScoutSources.map((source) => (
              <article key={source.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">{source.sourceClass.replaceAll("_", " ")}</p>
                    <h3 className="mt-1 text-sm font-black text-white">{source.label}</h3>
                  </div>
                  <span className="text-xs font-black text-emerald-300">{source.authorityWeight}</span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">{source.topics.slice(0, 5).map((topic) => topic.replaceAll("_", " ")).join(" · ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-300 text-black"><TrendingUp size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Scout Opportunity Queue</p>
              <h2 className="mt-2 text-3xl font-black text-white">Market changes tied to real customers.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Verified incentives, product changes, inventory shifts, pricing events, and safety updates can be matched against active Vehicle Hunts. High-value matches become salesperson or customer follow-up opportunities; unverified reporting stays informational and cannot trigger customer action.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">High score + verified</p><p className="mt-2 text-sm font-black text-white">Text / email opportunity</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">Medium relevance</p><p className="mt-2 text-sm font-black text-white">Salesperson review</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">Unverified / rumor</p><p className="mt-2 text-sm font-black text-white">No customer action</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-red-500/20 bg-red-500/[.035] p-6 sm:p-8">
          <div className="flex items-start gap-3"><Sparkles size={20} className="mt-1 text-red-300" /><div><h2 className="text-2xl font-black text-white">Next activation</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Persist Vehicle Hunts, connect Watchtower observations to those Hunts, then expose CRM adapters one provider at a time only after each provider contract and authorization path is verified.</p></div></div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="text-amber-300">{icon}</div><p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-slate-600">{title}</p><p className="mt-1 text-4xl font-black text-white">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></article>;
}
