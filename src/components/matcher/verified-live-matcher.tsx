"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck, X } from "lucide-react";
import type { InventoryCatalog } from "@/lib/inventory-catalog";
import { estimateBuyingPower, formatMoney, type Vehicle } from "@/lib/inventory";
import { cn } from "@/lib/cn";
import { LeadModal } from "./lead-modal";

const terms = [36, 48, 60, 72];

type Props = { catalog: InventoryCatalog };

export function VerifiedLiveMatcher({ catalog }: Props) {
  const vehicles = catalog.vehicles;
  const makes = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.make))].sort(), [vehicles]);
  const bodyTypes = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.type))].sort(), [vehicles]);
  const [monthlyTarget, setMonthlyTarget] = useState(600);
  const [downPayment, setDownPayment] = useState(5000);
  const [termMonths, setTermMonths] = useState(60);
  const [includedMakes, setIncludedMakes] = useState<string[]>(makes);
  const [bodyType, setBodyType] = useState("All");
  const [rejected, setRejected] = useState<string[]>([]);
  const [shortlisted, setShortlisted] = useState<string[]>([]);
  const [leadOpen, setLeadOpen] = useState(false);

  // Planning signal only. Never rendered as a vehicle-specific payment quote.
  const buyingPower = estimateBuyingPower(monthlyTarget, downPayment, termMonths);
  const eligible = useMemo(() => vehicles.filter((vehicle) =>
    vehicle.price <= buyingPower && includedMakes.includes(vehicle.make) && (bodyType === "All" || vehicle.type === bodyType)
  ), [vehicles, buyingPower, includedMakes, bodyType]);
  const active = eligible.filter((vehicle) => !rejected.includes(vehicle.id) && !shortlisted.includes(vehicle.id));
  const current = active[0];

  function reset() {
    setRejected([]);
    setShortlisted([]);
    setIncludedMakes(makes);
    setBodyType("All");
  }

  return <section id="matcher" className="scroll-mt-24 py-12 sm:py-20">
    <div className="shell">
      <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-400/25 bg-emerald-400/[.07] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={19} /></span><div><p className="text-sm font-black text-emerald-200">Verified live inventory</p><p className="mt-1 text-xs leading-5 text-slate-400">Fresh, matcher-eligible, non-transit units only.</p></div></div><div className="text-xs text-slate-500 sm:text-right"><p>{vehicles.length} eligible vehicles</p>{catalog.sourceEvidence?.fetchedAt && <p>Source checked {new Date(catalog.sourceEvidence.fetchedAt).toLocaleString()}</p>}</div></div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl text-center"><p className="eyebrow">Fit-first live matcher</p><h2 className="mt-4 text-4xl font-black tracking-[-.035em] text-white sm:text-5xl">Tell me what feels comfortable.<br className="hidden sm:block" /> I&apos;ll narrow the field.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400">Your monthly target is a planning preference, not a payment quote. Actual figures depend on the exact VIN, approved credit, lender terms, down payment, trade position, taxes, fees and incentives.</p></div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <aside className="panel h-fit p-5 sm:p-6">
          <div className="space-y-5">
            <Range label="Your comfort target" value={monthlyTarget} min={300} max={1200} step={25} display={`${formatMoney(monthlyTarget)}/mo`} onChange={setMonthlyTarget} />
            <Range label="Down payment / trade context" value={downPayment} min={0} max={20000} step={500} display={formatMoney(downPayment)} onChange={setDownPayment} />
            <div><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-200">Planning term</span><span className="text-sm font-bold text-slate-300">{termMonths} months</span></div><div className="mt-3 grid grid-cols-4 gap-2">{terms.map((term) => <button key={term} onClick={() => setTermMonths(term)} className={cn("rounded-xl border py-3 text-sm font-black", term === termMonths ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 text-slate-300")}>{term}</button>)}</div></div>
            <div><p className="text-sm font-bold text-slate-200">Brands included</p><div className="mt-3 flex flex-wrap gap-2">{makes.map((make) => <button key={make} onClick={() => setIncludedMakes((currentMakes) => currentMakes.includes(make) ? currentMakes.filter((item) => item !== make) : [...currentMakes, make])} className={cn("rounded-full border px-3 py-2 text-xs font-bold", includedMakes.includes(make) ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-600 line-through")}>{make}</button>)}</div></div>
            <div><p className="text-sm font-bold text-slate-200">Body style</p><div className="mt-3 flex flex-wrap gap-2">{["All", ...bodyTypes].map((type) => <button key={type} onClick={() => setBodyType(type)} className={cn("rounded-full border px-3 py-2 text-xs font-bold", bodyType === type ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 text-slate-400")}>{type}</button>)}</div></div>
            <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-500"><strong className="text-slate-300">Planning only.</strong> NorAutoMatch does not display or promise a vehicle-specific monthly payment here.</p>
          </div>
        </aside>

        <div className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">SwipeMatch preview</p><p className="mt-1 text-sm text-slate-400">{active.length} active matches · {shortlisted.length} in Garage</p></div>{(rejected.length > 0 || shortlisted.length > 0) && <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-slate-400"><RotateCcw size={14} /> Reset</button>}</div>
          <div className="mt-5 min-h-[330px]">{current ? <LiveVehicleCard vehicle={current} onPass={() => setRejected((ids) => [...ids, current.id])} onShortlist={() => setShortlisted((ids) => [...ids, current.id])} /> : <div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-6 text-center"><p className="eyebrow">Sourcing route</p><h3 className="mt-3 text-2xl font-black text-white">No verified match in this lane.</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Send the target and I can keep working the authorized sourcing path.</p><button onClick={() => setLeadOpen(true)} className="btn-primary mt-6">Keep looking for me <ArrowRight size={17} /></button></div>}</div>
        </div>
      </div>

      <div className="mt-10 rounded-[26px] border border-white/10 bg-white/[.02] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Inventory window</p><h3 className="mt-2 text-3xl font-black text-white">A quick look — not the whole lot.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">The homepage stays focused. Open the full inventory playground to search, SwipeMatch from any vehicle, build your Garage, or start a Garage Battle.</p></div><Link href="/inventory" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black">Browse all inventory <ArrowRight size={16} /></Link></div>
        <div className="mt-5 -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">{vehicles.slice(0, 8).map((vehicle) => <MiniCatalogCard key={vehicle.id} vehicle={vehicle} />)}</div>
      </div>
    </div>

    <LeadModal open={leadOpen} trigger={shortlisted.length ? "retail" : "trapdoor"} onClose={() => setLeadOpen(false)} monthlyTarget={monthlyTarget} downPayment={downPayment} termMonths={termMonths} shortlistedVehicleIds={shortlisted} context={shortlisted.length ? "Lead from verified live inventory matcher." : "Vehicle sourcing request from verified live inventory matcher."} />
  </section>;
}

function Range({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return <label className="block"><span className="flex items-center justify-between gap-4"><span className="text-sm font-bold text-slate-200">{label}</span><span className="text-sm font-bold text-slate-300">{display}</span></span><input type="range" className="range-track mt-3 w-full" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function LiveVehicleCard({ vehicle, onPass, onShortlist }: { vehicle: Vehicle; onPass: () => void; onShortlist: () => void }) {
  return <article className="rounded-[24px] border border-white/15 bg-slate-950 p-5 sm:p-6"><p className="text-xs font-bold text-emerald-300">VIN {vehicle.id}</p><h3 className="mt-2 text-3xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-2 text-sm text-slate-400">{vehicle.trim} · {vehicle.type} · {vehicle.drivetrain} · {vehicle.mileage.toLocaleString()} mi</p><p className="mt-4 text-xs text-slate-500">VIN-specific figures available when you&apos;re ready.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onPass} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 font-bold text-rose-200"><X size={18} /> Pass</button><button onClick={onShortlist} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 font-bold text-emerald-200"><Check size={18} /> Garage</button></div></article>;
}

function MiniCatalogCard({ vehicle }: { vehicle: Vehicle }) {
  return <Link href="/inventory" className="min-w-[255px] snap-start rounded-2xl border border-white/10 bg-[#0d131b] p-4 hover:border-amber-300/30"><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Verified live</p><h4 className="mt-2 font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h4><p className="mt-1 text-xs text-slate-500">{vehicle.trim} · {vehicle.drivetrain}</p><p className="mt-4 text-[11px] font-bold text-amber-300">Open & play →</p></Link>;
}
