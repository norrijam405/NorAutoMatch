"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck, X } from "lucide-react";
import type { InventoryCatalog } from "@/lib/inventory-catalog";
import { estimateBuyingPower, estimatePayment, formatMoney, type Vehicle } from "@/lib/inventory";
import { cn } from "@/lib/cn";
import { LeadModal } from "./lead-modal";

const terms = [36, 48, 60, 72];

type Props = {
  catalog: InventoryCatalog;
};

export function VerifiedLiveMatcher({ catalog }: Props) {
  const vehicles = catalog.vehicles;
  const makes = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.make))].sort(), [vehicles]);
  const bodyTypes = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.type))].sort(), [vehicles]);
  const [monthlyTarget, setMonthlyTarget] = useState(600);
  const [downPayment, setDownPayment] = useState(5000);
  const [termMonths, setTermMonths] = useState(60);
  const [includedMakes, setIncludedMakes] = useState<string[]>(makes);
  const [bodyType, setBodyType] = useState<string>("All");
  const [rejected, setRejected] = useState<string[]>([]);
  const [shortlisted, setShortlisted] = useState<string[]>([]);
  const [leadOpen, setLeadOpen] = useState(false);

  const buyingPower = estimateBuyingPower(monthlyTarget, downPayment, termMonths);
  const eligible = useMemo(() => vehicles.filter((vehicle) =>
    vehicle.price <= buyingPower &&
    includedMakes.includes(vehicle.make) &&
    (bodyType === "All" || vehicle.type === bodyType)
  ), [vehicles, buyingPower, includedMakes, bodyType]);

  const active = eligible.filter((vehicle) => !rejected.includes(vehicle.id) && !shortlisted.includes(vehicle.id));
  const current = active[0];

  function reset() {
    setRejected([]);
    setShortlisted([]);
    setIncludedMakes(makes);
    setBodyType("All");
  }

  function toggleMake(make: string) {
    setIncludedMakes((currentMakes) => currentMakes.includes(make)
      ? currentMakes.filter((item) => item !== make)
      : [...currentMakes, make]);
  }

  return (
    <section id="matcher" className="scroll-mt-24 py-16 sm:py-24">
      <div className="shell">
        <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-400/25 bg-emerald-400/[.07] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={19} /></span>
              <div>
                <p className="text-sm font-black text-emerald-200">Verified live Orr Nissan West inventory</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Only fresh, matcher-eligible, non-transit units from the bounded dealer 2175 snapshot are shown here.</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 sm:text-right">
              <p>{vehicles.length} eligible vehicles</p>
              {catalog.sourceEvidence?.fetchedAt && <p>Source checked {new Date(catalog.sourceEvidence.fetchedAt).toLocaleString()}</p>}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <p className="eyebrow">Live payment-first matcher</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.035em] text-white sm:text-5xl">Start with your number.<br className="hidden sm:block" /> Match against the verified row.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">The vehicle list can change as the dealership changes. Price and availability are revalidated server-side again when your shortlist becomes a lead.</p>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <aside className="panel h-fit overflow-hidden">
            <div className="space-y-7 p-5 sm:p-7">
              <Range label="Monthly target" value={monthlyTarget} min={300} max={1200} step={25} display={`${formatMoney(monthlyTarget)}/mo`} onChange={setMonthlyTarget} />
              <Range label="Down payment / trade equity" value={downPayment} min={0} max={20000} step={500} display={formatMoney(downPayment)} onChange={setDownPayment} />
              <div>
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-200">Loan term</span><span className="text-sm font-black text-white">{termMonths} months</span></div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {terms.map((term) => <button key={term} onClick={() => setTermMonths(term)} className={cn("rounded-xl border py-3 text-sm font-black", term === termMonths ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/10 bg-white/[.03] text-slate-300")}>{term}</button>)}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-200">Brands included</span><span className="text-xs text-slate-500">Tap to exclude</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {makes.map((make) => <button key={make} onClick={() => toggleMake(make)} className={cn("rounded-full border px-3 py-2 text-xs font-bold", includedMakes.includes(make) ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-600 line-through")}><Check size={12} className="mr-1 inline" />{make}</button>)}
                </div>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-200">Body style</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["All", ...bodyTypes].map((type) => <button key={type} onClick={() => setBodyType(type)} className={cn("rounded-full border px-3 py-2 text-xs font-bold", bodyType === type ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/10 text-slate-400")}>{type}</button>)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-5 text-slate-500">Payment math is a shopping estimate using 7% APR and excludes taxes, title, registration, dealer fees, add-ons, and credit approval. It is not a credit offer.</div>
            </div>
          </aside>

          <div className="panel p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="eyebrow">Verified fit deck</p><p className="mt-1 text-sm text-slate-400">{active.length} active matches · {shortlisted.length} shortlisted</p></div>
              {(rejected.length > 0 || shortlisted.length > 0) && <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-slate-400"><RotateCcw size={14} /> Reset</button>}
            </div>

            <div className="mt-5 min-h-[440px]">
              {current ? <LiveVehicleCard
                vehicle={current}
                payment={estimatePayment(current.price, downPayment, termMonths)}
                onPass={() => setRejected((ids) => [...ids, current.id])}
                onShortlist={() => setShortlisted((ids) => [...ids, current.id])}
              /> : <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-8 text-center"><p className="eyebrow">Sourcing route</p><h3 className="mt-3 text-3xl font-black text-white">No verified active match in this lane.</h3><p className="mt-4 max-w-lg leading-7 text-slate-400">That does not mean there is no deal. Send the target and I can work the vehicle-sourcing path.</p><button onClick={() => setLeadOpen(true)} className="btn-primary mt-7">Start vehicle sourcing <ArrowRight size={17} /></button></div>}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">Verified live catalog</p><h3 className="mt-2 text-3xl font-black text-white">Every currently eligible unit</h3></div><p className="text-xs text-slate-500">In-transit, stale, malformed, inactive and unverified units are excluded upstream.</p></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.slice(0, 60).map((vehicle) => <LiveCatalogCard key={vehicle.id} vehicle={vehicle} payment={estimatePayment(vehicle.price, downPayment, termMonths)} shortlisted={shortlisted.includes(vehicle.id)} onAsk={() => { if (!shortlisted.includes(vehicle.id)) setShortlisted((ids) => [...ids, vehicle.id]); setLeadOpen(true); }} />)}
          </div>
          {vehicles.length > 60 && <p className="mt-5 text-center text-xs text-slate-500">Showing the first 60 verified units in this interface while search/filter UX is hardened.</p>}
        </div>
      </div>

      <LeadModal open={leadOpen} trigger={shortlisted.length ? "retail" : "trapdoor"} onClose={() => setLeadOpen(false)} monthlyTarget={monthlyTarget} downPayment={downPayment} termMonths={termMonths} shortlistedVehicleIds={shortlisted} context={shortlisted.length ? "Lead from verified live inventory matcher." : "Vehicle sourcing request from verified live inventory matcher."} />
    </section>
  );
}

function Range({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return <label className="block"><span className="flex items-center justify-between"><span className="text-sm font-bold text-slate-200">{label}</span><span className="text-lg font-black text-white">{display}</span></span><input type="range" className="range-track mt-4 w-full" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span className="mt-2 flex justify-between text-[10px] text-slate-600"><span>{formatMoney(min)}</span><span>{formatMoney(max)}</span></span></label>;
}

function LiveVehicleCard({ vehicle, payment, onPass, onShortlist }: { vehicle: Vehicle; payment: number; onPass: () => void; onShortlist: () => void }) {
  return <article className="rounded-[26px] border border-white/15 bg-slate-950 p-6 shadow-card"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold text-emerald-300">VIN {vehicle.id}</p><h3 className="mt-2 text-3xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-2 text-sm text-slate-400">{vehicle.trim} · {vehicle.type} · {vehicle.drivetrain} · {vehicle.mileage.toLocaleString()} mi</p></div><div className="sm:text-right"><p className="text-2xl font-black text-white">{formatMoney(vehicle.price)}</p><p className="mt-1 text-sm font-bold text-emerald-300">~{formatMoney(payment)}/mo</p></div></div><div className="mt-8 grid grid-cols-2 gap-3"><button onClick={onPass} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 font-bold text-rose-200"><X size={18} /> Pass</button><button onClick={onShortlist} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 font-bold text-emerald-200"><Check size={18} /> Shortlist</button></div></article>;
}

function LiveCatalogCard({ vehicle, payment, shortlisted, onAsk }: { vehicle: Vehicle; payment: number; shortlisted: boolean; onAsk: () => void }) {
  return <article className={cn("rounded-2xl border bg-slate-900/70 p-5", shortlisted ? "border-emerald-400/40" : "border-white/10")}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Verified live</p><h4 className="mt-2 font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h4><p className="mt-1 text-xs text-slate-500">{vehicle.trim} · {vehicle.drivetrain} · {vehicle.mileage.toLocaleString()} mi</p></div><p className="text-right text-sm font-black text-white">{formatMoney(vehicle.price)}</p></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"><p className="text-xs text-slate-500">~<strong className="text-emerald-300">{formatMoney(payment)}/mo</strong></p><button onClick={onAsk} className="text-xs font-bold text-amber-300">{shortlisted ? "Ask about it →" : "Shortlist + ask →"}</button></div></article>;
}
