"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, Filter, Heart, Search, Shuffle, Sparkles, X } from "lucide-react";
import type { Vehicle } from "@/lib/inventory";
import { cn } from "@/lib/cn";
import { FinanceInterestModal } from "@/components/finance/finance-interest-modal";

type Props = {
  vehicles: Vehicle[];
  fetchedAt?: string;
};

export function InteractiveInventory({ vehicles, fetchedAt }: Props) {
  const [query, setQuery] = useState("");
  const [bodyType, setBodyType] = useState("All");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [battle, setBattle] = useState<string[]>([]);
  const [swipeSeed, setSwipeSeed] = useState<string | null>(null);
  const [financeVehicle, setFinanceVehicle] = useState<Vehicle | null>(null);

  const bodyTypes = useMemo(() => ["All", ...new Set(vehicles.map((vehicle) => vehicle.type))], [vehicles]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const haystack = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} ${vehicle.drivetrain} ${vehicle.type}`.toLowerCase();
      return (bodyType === "All" || vehicle.type === bodyType) && (!needle || haystack.includes(needle));
    });
  }, [vehicles, query, bodyType]);

  const seededDeck = useMemo(() => {
    if (!swipeSeed) return [];
    const seed = vehicles.find((vehicle) => vehicle.id === swipeSeed);
    if (!seed) return [];
    return [seed, ...vehicles.filter((vehicle) => vehicle.id !== seed.id && (vehicle.type === seed.type || vehicle.make === seed.make)).slice(0, 7)];
  }, [swipeSeed, vehicles]);

  function toggleShortlist(id: string) {
    setShortlist((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleBattle(id: string) {
    setBattle((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) return [current[1], id];
      return [...current, id];
    });
  }

  const battleVehicles = battle.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean) as Vehicle[];

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[.025] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-emerald-300">Verified inventory playground</p>
            <h1 className="mt-3 text-4xl font-black leading-[.88] tracking-[-.055em] text-white sm:text-6xl">SHOP IT.<br /><span className="text-red-500">PLAY WITH IT.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Search normally, or turn any real vehicle into a SwipeMatch deck, a Garage save, or a head-to-head Garage Battle. No vehicle-specific payment promises are shown here.</p>
          </div>
          <div className="text-xs text-slate-500 lg:text-right">
            <p>{vehicles.length} verified eligible units</p>
            {fetchedAt && <p>Source checked {new Date(fetchedAt).toLocaleString()}</p>}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4">
            <Search size={18} className="text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search model, trim, drivetrain…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {bodyTypes.map((type) => <button key={type} onClick={() => setBodyType(type)} className={cn("min-h-12 shrink-0 rounded-full border px-4 text-xs font-black", bodyType === type ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 text-slate-300")}><Filter size={13} className="mr-1 inline" />{type}</button>)}
          </div>
        </div>
      </section>

      {battleVehicles.length === 2 && <section className="relative overflow-hidden rounded-[28px] border border-red-500/30 bg-[#0b0f15] p-5 sm:p-7">
        <div className="absolute -right-20 top-8 h-5 w-72 -rotate-6 bg-red-600" />
        <p className="relative text-[10px] font-black uppercase tracking-[.3em] text-red-400">Garage Battle</p>
        <div className="relative mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <BattleSide vehicle={battleVehicles[0]} />
          <div className="mx-auto text-4xl font-black italic text-red-500">VS</div>
          <BattleSide vehicle={battleVehicles[1]} />
        </div>
        <p className="relative mt-5 text-sm leading-6 text-slate-400">This is a fit comparison, not a universal winner. The next layer will score the battle against the shopper&apos;s actual Match DNA.</p>
      </section>}

      {swipeSeed && seededDeck.length > 0 && <SwipeMiniGame deck={seededDeck} onClose={() => setSwipeSeed(null)} onKeep={(id) => { if (!shortlist.includes(id)) setShortlist((current) => [...current, id]); }} />}

      <section>
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Full verified catalog</p><h2 className="mt-2 text-3xl font-black text-white">{filtered.length} vehicles in this view</h2></div>
          <button onClick={() => { const random = filtered[Math.floor(Math.random() * Math.max(filtered.length, 1))]; if (random) setSwipeSeed(random.id); }} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-slate-300 sm:inline-flex"><Shuffle size={15} /> Surprise me</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vehicle) => <InventoryPlayCard
            key={vehicle.id}
            vehicle={vehicle}
            shortlisted={shortlist.includes(vehicle.id)}
            battling={battle.includes(vehicle.id)}
            onShortlist={() => toggleShortlist(vehicle.id)}
            onBattle={() => toggleBattle(vehicle.id)}
            onSwipe={() => setSwipeSeed(vehicle.id)}
            onFinance={() => setFinanceVehicle(vehicle)}
          />)}
        </div>
      </section>

      <FinanceInterestModal vehicle={financeVehicle} onClose={() => setFinanceVehicle(null)} />
    </div>
  );
}

function InventoryPlayCard({ vehicle, shortlisted, battling, onShortlist, onBattle, onSwipe, onFinance }: { vehicle: Vehicle; shortlisted: boolean; battling: boolean; onShortlist: () => void; onBattle: () => void; onSwipe: () => void; onFinance: () => void }) {
  return <article className={cn("rounded-[24px] border bg-[#0d131b] p-5", shortlisted ? "border-emerald-400/35" : "border-white/10")}>
    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Verified live</p><h3 className="mt-2 text-xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{vehicle.trim} · {vehicle.drivetrain} · {vehicle.mileage.toLocaleString()} mi</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black text-white/45">{vehicle.type}</span></div>
    <p className="mt-4 text-xs leading-5 text-slate-500">VIN {vehicle.id}</p>
    <div className="mt-5 grid grid-cols-2 gap-2">
      <button onClick={onSwipe} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-black text-white"><Sparkles size={15} /> SwipeMatch</button>
      <button onClick={onShortlist} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black", shortlisted ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-300")}><Heart size={15} /> {shortlisted ? "In Garage" : "Garage"}</button>
      <button onClick={onBattle} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black", battling ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/10 text-slate-300")}><ArrowLeftRight size={15} /> Battle</button>
      <button onClick={onFinance} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-xs font-black text-slate-300">Finance next step</button>
    </div>
  </article>;
}

function SwipeMiniGame({ deck, onClose, onKeep }: { deck: Vehicle[]; onClose: () => void; onKeep: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const current = deck[index];
  if (!current) return <section className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/[.05] p-7 text-center"><p className="text-2xl font-black text-white">Deck complete.</p><button onClick={onClose} className="mt-4 rounded-full border border-white/10 px-5 py-3 text-sm font-black text-white">Close deck</button></section>;
  return <section className="rounded-[28px] border border-red-500/25 bg-black p-5 sm:p-7">
    <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Mini SwipeMatch</p><p className="mt-1 text-xs text-slate-500">{index + 1} / {deck.length}</p></div><button onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/10 text-slate-400"><X size={17} /></button></div>
    <div className="mx-auto mt-6 max-w-2xl rounded-[26px] border border-white/15 bg-[#0d131b] p-6 text-center"><p className="text-xs font-bold text-emerald-300">VIN {current.id}</p><h3 className="mt-3 text-3xl font-black text-white">{current.year} {current.make} {current.model}</h3><p className="mt-2 text-sm text-slate-400">{current.trim} · {current.type} · {current.drivetrain}</p><div className="mt-7 grid grid-cols-2 gap-3"><button onClick={() => setIndex((value) => value + 1)} className="min-h-12 rounded-xl border border-rose-400/25 bg-rose-400/10 font-black text-rose-200"><X size={17} className="mr-2 inline" />Pass</button><button onClick={() => { onKeep(current.id); setIndex((value) => value + 1); }} className="min-h-12 rounded-xl border border-emerald-400/25 bg-emerald-400/10 font-black text-emerald-200"><Check size={17} className="mr-2 inline" />Keep</button></div></div>
  </section>;
}

function BattleSide({ vehicle }: { vehicle: Vehicle }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300">Verified live</p><h3 className="mt-2 text-2xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-2 text-sm text-slate-400">{vehicle.trim}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-xl border border-white/10 p-3 text-slate-300">{vehicle.drivetrain}</span><span className="rounded-xl border border-white/10 p-3 text-slate-300">{vehicle.mileage.toLocaleString()} mi</span></div></div>;
}
