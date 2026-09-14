"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Check, Filter, Heart, Search, Shuffle, Sparkles, X } from "lucide-react";
import type { Vehicle } from "@/lib/inventory";
import { searchInventory, vehicleHasFeature, type InventorySearchMatch } from "@/lib/inventory-search";
import { cn } from "@/lib/cn";
import { FinanceInterestModal } from "@/components/finance/finance-interest-modal";

type Props = {
  vehicles: Vehicle[];
  fetchedAt?: string;
};

type SmartFilter = {
  id: string;
  label: string;
};

const smartFilters: SmartFilter[] = [
  { id: "awd", label: "AWD / 4WD" },
  { id: "carplay", label: "CarPlay" },
  { id: "heated-seats", label: "Heated seats" },
  { id: "leather", label: "Leather" },
  { id: "sunroof", label: "Sunroof" },
  { id: "third-row", label: "3rd row" },
];

const PAGE_SIZE = 12;
const CLOSE_MATCH_LIMIT = 6;

export function InteractiveInventory({ vehicles, fetchedAt }: Props) {
  const [query, setQuery] = useState("");
  const [bodyType, setBodyType] = useState("All");
  const [activeSmartFilters, setActiveSmartFilters] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [battle, setBattle] = useState<string[]>([]);
  const [swipeSeed, setSwipeSeed] = useState<string | null>(null);
  const [financeVehicle, setFinanceVehicle] = useState<Vehicle | null>(null);

  const bodyTypes = useMemo(() => ["All", ...new Set(vehicles.map((vehicle) => vehicle.type))], [vehicles]);
  const availableSmartFilters = useMemo(() => smartFilters.filter((filter) => vehicles.some((vehicle) => smartFilterMatches(vehicle, filter.id))), [vehicles]);

  const filterEligibleVehicles = useMemo(() => vehicles.filter((vehicle) => {
    if (bodyType !== "All" && vehicle.type !== bodyType) return false;
    return activeSmartFilters.every((id) => smartFilterMatches(vehicle, id));
  }), [vehicles, bodyType, activeSmartFilters]);

  const searchResult = useMemo(() => searchInventory(filterEligibleVehicles, query), [filterEligibleVehicles, query]);
  const queryActive = query.trim().length > 0;
  const exactMatches = queryActive ? searchResult.exact : searchResult.exact;
  const closeMatches = queryActive ? searchResult.close.slice(0, CLOSE_MATCH_LIMIT) : [];
  const visibleExactMatches = exactMatches.slice(0, visibleCount);
  const primaryVehicles = exactMatches.map((match) => match.vehicle);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query, bodyType, activeSmartFilters]);

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

  function toggleSmartFilter(id: string) {
    setActiveSmartFilters((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function clearSearch() {
    setQuery("");
    setBodyType("All");
    setActiveSmartFilters([]);
  }

  const battleVehicles = battle.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean) as Vehicle[];
  const shortlistVehicles = shortlist.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean) as Vehicle[];

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[.025] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.3em] text-emerald-300">Verified inventory playground</p>
            <h1 className="mt-3 text-4xl font-black leading-[.88] tracking-[-.055em] text-white sm:text-6xl">SHOP IT.<br /><span className="text-red-500">PLAY WITH IT.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Type what you actually want — <strong className="text-slate-200">“gun metal Rogue”</strong>, <strong className="text-slate-200">“CarPlay SUV”</strong>, or <strong className="text-slate-200">“red Rogue AWD”</strong>. Recognized model, color, drivetrain, condition, and source-provided feature constraints are treated as requirements, not suggestions.</p>
          </div>
          <div className="text-xs text-slate-500 lg:text-right">
            <p>{vehicles.length} verified eligible units</p>
            {fetchedAt && <p>Source checked {new Date(fetchedAt).toLocaleString()}</p>}
          </div>
        </div>

        <div className="mt-6">
          <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-amber-300/25 bg-black/35 px-4 focus-within:border-amber-300/70">
            <Search size={19} className="shrink-0 text-amber-300" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: gun metal Rogue AWD with CarPlay" className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-600" />
            {query && <button onClick={() => setQuery("")} className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Clear search"><X size={16} /></button>}
          </label>
          <p className="mt-2 text-[11px] leading-5 text-slate-600">Feature matches come only from source-provided feature evidence. If a close match differs, NorAuto says exactly what is missing instead of silently breaking your request.</p>
          {queryActive && searchResult.parsed.constraints.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
            {searchResult.parsed.constraints.map((constraint, index) => <span key={`${constraint.kind}-${constraint.value}-${index}`} className="rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-2.5 py-1 text-[10px] font-bold text-emerald-200">Required: {constraint.label}</span>)}
          </div>}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {bodyTypes.map((type) => <button key={type} onClick={() => setBodyType(type)} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-xs font-black", bodyType === type ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 text-slate-300")}><Filter size={13} className="mr-1 inline" />{type}</button>)}
        </div>

        {availableSmartFilters.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {availableSmartFilters.map((filter) => <button key={filter.id} onClick={() => toggleSmartFilter(filter.id)} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-[11px] font-black", activeSmartFilters.includes(filter.id) ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-500")}>{activeSmartFilters.includes(filter.id) && <Check size={12} className="mr-1 inline" />}{filter.label}</button>)}
        </div>}
      </section>

      {shortlistVehicles.length > 0 && <section className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/[.04] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300">Your Garage</p><p className="mt-1 text-sm font-bold text-white">{shortlistVehicles.length} survivor{shortlistVehicles.length === 1 ? "" : "s"} saved from this session</p></div>{shortlistVehicles.length >= 2 && <p className="text-xs font-black text-amber-300">Pick any two → Battle</p>}</div>
      </section>}

      {battleVehicles.length === 2 && <section className="relative overflow-hidden rounded-[28px] border border-red-500/30 bg-[#0b0f15] p-5 sm:p-7">
        <div className="absolute -right-20 top-8 h-5 w-72 -rotate-6 bg-red-600" />
        <p className="relative text-[10px] font-black uppercase tracking-[.3em] text-red-400">Garage Battle</p>
        <div className="relative mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <BattleSide vehicle={battleVehicles[0]} />
          <div className="mx-auto text-4xl font-black italic text-red-500">VS</div>
          <BattleSide vehicle={battleVehicles[1]} />
        </div>
        <p className="relative mt-5 text-sm leading-6 text-slate-400">This is a fit comparison, not a universal winner. NorAuto only uses facts present in the verified vehicle evidence and will keep unknown lifestyle dimensions explicit.</p>
      </section>}

      {swipeSeed && seededDeck.length > 0 && <SwipeMiniGame deck={seededDeck} onClose={() => setSwipeSeed(null)} onKeep={(id) => { if (!shortlist.includes(id)) setShortlist((current) => [...current, id]); }} />}

      <section>
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">{queryActive ? "Exact matches" : "Full verified catalog"}</p><h2 className="mt-2 text-3xl font-black text-white">{exactMatches.length} vehicle{exactMatches.length === 1 ? "" : "s"} {queryActive ? "meet every recognized requirement" : "in this view"}</h2><p className="mt-2 text-xs text-slate-600">Showing {Math.min(visibleExactMatches.length, exactMatches.length)} now so mobile never becomes an endless wall of cards.</p></div>
          <button onClick={() => { const random = primaryVehicles[Math.floor(Math.random() * Math.max(primaryVehicles.length, 1))]; if (random) setSwipeSeed(random.id); }} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-slate-300 sm:inline-flex"><Shuffle size={15} /> Surprise me</button>
        </div>

        {exactMatches.length === 0 ? <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[.025] p-7 text-center sm:p-10"><p className="text-2xl font-black text-white">No verified unit matches every recognized requirement.</p><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">NorAuto did not weaken your model, color, drivetrain, or feature request to manufacture a result. Check the labeled close matches below, or clear a requirement yourself.</p>{closeMatches.length === 0 && <button onClick={clearSearch} className="mt-6 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">Clear search</button>}</div> : <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleExactMatches.map((match) => <InventoryPlayCard
              key={match.vehicle.id}
              vehicle={match.vehicle}
              shortlisted={shortlist.includes(match.vehicle.id)}
              battling={battle.includes(match.vehicle.id)}
              onShortlist={() => toggleShortlist(match.vehicle.id)}
              onBattle={() => toggleBattle(match.vehicle.id)}
              onSwipe={() => setSwipeSeed(match.vehicle.id)}
              onFinance={() => setFinanceVehicle(match.vehicle)}
            />)}
          </div>
          {visibleCount < exactMatches.length && <div className="mt-7 flex justify-center"><button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="min-h-12 rounded-full border border-amber-300/30 bg-amber-300/[.06] px-7 text-sm font-black text-amber-200">Show {Math.min(PAGE_SIZE, exactMatches.length - visibleCount)} more</button></div>}
        </>}
      </section>

      {queryActive && closeMatches.length > 0 && <section className="rounded-[28px] border border-amber-300/15 bg-amber-300/[.025] p-5 sm:p-7">
        <div className="flex items-start gap-3"><AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-300" /><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Close matches — not exact</p><h2 className="mt-2 text-2xl font-black text-white">These vehicles break at least one recognized requirement.</h2><p className="mt-2 text-sm leading-6 text-slate-400">The difference is shown on each card. No missing source feature is treated as present.</p></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {closeMatches.map((match) => <InventoryPlayCard
            key={`close-${match.vehicle.id}`}
            vehicle={match.vehicle}
            match={match}
            shortlisted={shortlist.includes(match.vehicle.id)}
            battling={battle.includes(match.vehicle.id)}
            onShortlist={() => toggleShortlist(match.vehicle.id)}
            onBattle={() => toggleBattle(match.vehicle.id)}
            onSwipe={() => setSwipeSeed(match.vehicle.id)}
            onFinance={() => setFinanceVehicle(match.vehicle)}
          />)}
        </div>
      </section>}

      <FinanceInterestModal vehicle={financeVehicle} onClose={() => setFinanceVehicle(null)} />
    </div>
  );
}

function smartFilterMatches(vehicle: Vehicle, filterId: string) {
  if (filterId === "awd") {
    const drivetrain = vehicle.drivetrain.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    return drivetrain.includes("awd") || drivetrain.includes("4wd") || drivetrain.includes("4x4") || drivetrain.includes("all wheel drive") || drivetrain.includes("four wheel drive");
  }
  return vehicleHasFeature(vehicle, filterId);
}

function InventoryPlayCard({ vehicle, match, shortlisted, battling, onShortlist, onBattle, onSwipe, onFinance }: { vehicle: Vehicle; match?: InventorySearchMatch; shortlisted: boolean; battling: boolean; onShortlist: () => void; onBattle: () => void; onSwipe: () => void; onFinance: () => void }) {
  return <article className={cn("overflow-hidden rounded-[24px] border bg-[#0d131b]", match?.kind === "close" ? "border-amber-300/25" : shortlisted ? "border-emerald-400/35" : "border-white/10")}>
    <div className="relative aspect-[16/9] overflow-hidden bg-[#111923]">
      <img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" loading="lazy" />
      <span className={cn("absolute left-3 top-3 rounded-full border bg-black/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] backdrop-blur", match?.kind === "close" ? "border-amber-300/25 text-amber-200" : "border-white/10 text-emerald-300")}>{match?.kind === "close" ? "Close match" : "Verified live"}</span>
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{vehicle.trim} · {vehicle.drivetrain} · {vehicle.mileage.toLocaleString()} mi</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black text-white/45">{vehicle.type}</span></div>
      {(vehicle.exteriorColor || vehicle.accent) && <p className="mt-3 text-xs font-bold text-slate-400">{vehicle.exteriorColor ?? vehicle.accent}{vehicle.condition ? ` · ${vehicle.condition}` : ""}</p>}
      {match?.kind === "close" && match.missing.length > 0 && <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300">What differs</p>{match.missing.map((reason) => <p key={reason} className="mt-1 text-[11px] leading-5 text-amber-100/75">• {reason}</p>)}</div>}
      {vehicle.features && vehicle.features.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{vehicle.features.slice(0, 3).map((feature) => <span key={feature} className="rounded-full bg-white/[.04] px-2 py-1 text-[9px] font-bold text-slate-500">{feature}</span>)}</div>}
      <p className="mt-4 text-[10px] leading-5 text-slate-600">VIN {vehicle.id}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={onSwipe} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-black text-white"><Sparkles size={15} /> SwipeMatch</button>
        <button onClick={onShortlist} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black", shortlisted ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-300")}><Heart size={15} /> {shortlisted ? "In Garage" : "Garage"}</button>
        <button onClick={onBattle} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black", battling ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/10 text-slate-300")}><ArrowLeftRight size={15} /> Battle</button>
        <button onClick={onFinance} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 text-xs font-black text-slate-300">Finance next step</button>
      </div>
    </div>
  </article>;
}

function SwipeMiniGame({ deck, onClose, onKeep }: { deck: Vehicle[]; onClose: () => void; onKeep: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const current = deck[index];
  if (!current) return <section className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/[.05] p-7 text-center"><p className="text-2xl font-black text-white">Deck complete.</p><button onClick={onClose} className="mt-4 rounded-full border border-white/10 px-5 py-3 text-sm font-black text-white">Close deck</button></section>;
  return <section className="rounded-[28px] border border-red-500/25 bg-black p-5 sm:p-7">
    <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Mini SwipeMatch</p><p className="mt-1 text-xs text-slate-500">{index + 1} / {deck.length}</p></div><button onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/10 text-slate-400"><X size={17} /></button></div>
    <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-[26px] border border-white/15 bg-[#0d131b]"><div className="aspect-[16/9] bg-[#111923]"><img src={current.image} alt={`${current.year} ${current.make} ${current.model}`} className="h-full w-full object-cover" /></div><div className="p-6 text-center"><p className="text-xs font-bold text-emerald-300">VIN {current.id}</p><h3 className="mt-3 text-3xl font-black text-white">{current.year} {current.make} {current.model}</h3><p className="mt-2 text-sm text-slate-400">{current.trim} · {current.type} · {current.drivetrain}</p><div className="mt-7 grid grid-cols-2 gap-3"><button onClick={() => setIndex((value) => value + 1)} className="min-h-12 rounded-xl border border-rose-400/25 bg-rose-400/10 font-black text-rose-200"><X size={17} className="mr-2 inline" />Pass</button><button onClick={() => { onKeep(current.id); setIndex((value) => value + 1); }} className="min-h-12 rounded-xl border border-emerald-400/25 bg-emerald-400/10 font-black text-emerald-200"><Check size={17} className="mr-2 inline" />Keep</button></div></div></div>
  </section>;
}

function BattleSide({ vehicle }: { vehicle: Vehicle }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300">Verified live</p><h3 className="mt-2 text-2xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-2 text-sm text-slate-400">{vehicle.trim}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-xl border border-white/10 p-3 text-slate-300">{vehicle.drivetrain}</span><span className="rounded-xl border border-white/10 p-3 text-slate-300">{vehicle.mileage.toLocaleString()} mi</span></div></div>;
}
