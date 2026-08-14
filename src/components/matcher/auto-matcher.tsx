"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Ban,
  Check,
  Heart,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { bodyTypes, estimateBuyingPower, estimatePayment, formatMoney, inventory, makes, type Vehicle } from "@/lib/inventory";
import { cn } from "@/lib/cn";
import { LeadModal } from "./lead-modal";

const terms = [36, 48, 60, 72];
type Tab = "matcher" | "browse";
type ModalState = { open: boolean; trigger: "retail" | "trapdoor"; context?: string };

export function AutoMatcher() {
  const [tab, setTab] = useState<Tab>("matcher");
  const [monthlyTarget, setMonthlyTarget] = useState(600);
  const [downPayment, setDownPayment] = useState(5000);
  const [termMonths, setTermMonths] = useState(60);
  const [includedMakes, setIncludedMakes] = useState<string[]>(makes);
  const [bodyType, setBodyType] = useState<string>("All");
  const [rejected, setRejected] = useState<string[]>([]);
  const [shortlisted, setShortlisted] = useState<string[]>([]);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false, trigger: "retail" });

  const buyingPower = estimateBuyingPower(monthlyTarget, downPayment, termMonths);
  const eligible = useMemo(
    () => inventory.filter((vehicle) =>
      vehicle.price <= buyingPower &&
      includedMakes.includes(vehicle.make) &&
      (bodyType === "All" || vehicle.type === bodyType)
    ),
    [buyingPower, includedMakes, bodyType]
  );
  const activeDeck = eligible.filter((vehicle) => !rejected.includes(vehicle.id) && !shortlisted.includes(vehicle.id));
  const current = activeDeck[0];

  function swipe(direction: "left" | "right") {
    if (!current) return;
    if (direction === "left") setRejected((ids) => [...ids, current.id]);
    if (direction === "right") setShortlisted((ids) => [...ids, current.id]);
    setDragX(0);
  }

  function resetDeck() {
    setRejected([]);
    setShortlisted([]);
    setIncludedMakes(makes);
    setBodyType("All");
  }

  function toggleMake(make: string) {
    setIncludedMakes((currentMakes) => currentMakes.includes(make) ? currentMakes.filter((item) => item !== make) : [...currentMakes, make]);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    setDragX(Math.max(-150, Math.min(150, event.clientX - dragStart.current)));
  }

  function onPointerUp() {
    if (dragX > 78) swipe("right");
    else if (dragX < -78) swipe("left");
    else setDragX(0);
    dragStart.current = null;
    setIsDragging(false);
  }

  function openLead(trigger: "retail" | "trapdoor", context?: string) {
    setModal({ open: true, trigger, context });
  }

  return (
    <section id="matcher" className="scroll-mt-24 py-16 sm:py-24">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">The car search, flipped</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.035em] text-white sm:text-5xl">Start with your number.<br className="hidden sm:block" /> Not a row of cars.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Set the payment. Swipe what fits. If the right vehicle is not here, I go find it across the network.</p>
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl rounded-2xl border border-white/10 bg-slate-900/80 p-1.5" role="tablist" aria-label="Choose car search mode">
          <button role="tab" aria-selected={tab === "matcher"} onClick={() => setTab("matcher")} className={cn("flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold", tab === "matcher" ? "bg-amber-400 text-slate-950 shadow-lg" : "text-slate-400 hover:text-white")}><SlidersHorizontal size={17} /> Interactive Matcher</button>
          <button role="tab" aria-selected={tab === "browse"} onClick={() => setTab("browse")} className={cn("flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold", tab === "browse" ? "bg-amber-400 text-slate-950 shadow-lg" : "text-slate-400 hover:text-white")}><Search size={17} /> Traditional Browse</button>
        </div>

        {tab === "matcher" ? (
          <div role="tabpanel" className="mt-7 animate-slide-up">
            <div className="grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
              <aside className="panel h-fit overflow-hidden">
                <div className="border-b border-white/10 px-5 py-5 sm:px-7">
                  <div className="flex items-center justify-between gap-4">
                    <div><p className="eyebrow">Your buying lane</p><h3 className="mt-2 text-2xl font-black text-white">Build the number</h3></div>
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-200/70">Buying power</p>
                      <p className="mt-1 text-2xl font-black text-amber-300">{formatMoney(buyingPower)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-7 px-5 py-6 sm:px-7">
                  <SliderControl label="Monthly target payment" value={monthlyTarget} min={300} max={1000} step={25} display={`${formatMoney(monthlyTarget)}/mo`} onChange={setMonthlyTarget} />
                  <SliderControl label="Down payment / trade equity" value={downPayment} min={0} max={15000} step={500} display={formatMoney(downPayment)} onChange={setDownPayment} />
                  <div>
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-200">Loan term</span><span className="text-sm font-black text-white">{termMonths} months</span></div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {terms.map((term) => <button key={term} onClick={() => setTermMonths(term)} className={cn("rounded-xl border py-3 text-sm font-black", term === termMonths ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/10 bg-white/[.03] text-slate-300 hover:border-white/25")}>{term}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-200">Brands included</span><span className="text-xs text-slate-500">Tap to exclude</span></div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {makes.map((make) => <button key={make} onClick={() => toggleMake(make)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold", includedMakes.includes(make) ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-slate-950 text-slate-600 line-through")}><Check size={13} /> {make}</button>)}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-200">Body style</span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["All", ...bodyTypes].map((type) => <button key={type} onClick={() => setBodyType(type)} className={cn("rounded-full border px-3 py-2 text-xs font-bold", bodyType === type ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/10 bg-white/[.03] text-slate-400 hover:text-white")}>{type}</button>)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-5 text-slate-500">
                    Estimate assumes 7% APR. Taxes, title, registration, dealer fees, add-ons, and credit approval are not included. This is a shopping guide—not a credit offer.
                  </div>
                </div>
              </aside>

              <div className="panel relative min-h-[660px] overflow-hidden p-4 sm:p-6">
                <div className="absolute inset-0 grid-noise opacity-40" />
                <div className="relative flex items-center justify-between gap-4">
                  <div><p className="eyebrow">Swipe the fit</p><p className="mt-1 text-sm text-slate-400">{activeDeck.length} active {activeDeck.length === 1 ? "match" : "matches"} · {shortlisted.length} shortlisted</p></div>
                  {(rejected.length > 0 || shortlisted.length > 0) && <button onClick={resetDeck} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white"><RotateCcw size={14} /> Reset</button>}
                </div>

                <div className="relative z-[1] mt-5 min-h-[565px]">
                  {current ? (
                    <div className="mx-auto max-w-xl select-none touch-pan-y" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`, transition: isDragging ? "none" : "transform .24s ease", cursor: isDragging ? "grabbing" : "grab" }}>
                      <VehicleSwipeCard vehicle={current} monthly={estimatePayment(current.price, downPayment, termMonths)} dragX={dragX} />
                      <div className="mt-5 flex items-center justify-center gap-4">
                        <button onClick={() => swipe("left")} className="grid size-14 place-items-center rounded-full border border-rose-400/25 bg-rose-400/10 text-rose-300 shadow-lg hover:scale-105 hover:bg-rose-400/20" aria-label="Pass on this vehicle"><X size={26} /></button>
                        <span className="hidden text-xs font-semibold text-slate-500 sm:block">Pass</span>
                        <span className="hidden text-xs font-semibold text-slate-500 sm:block">Shortlist</span>
                        <button onClick={() => swipe("right")} className="grid size-14 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-lg hover:scale-105 hover:bg-emerald-400/20" aria-label="Shortlist this vehicle"><Heart size={25} /></button>
                      </div>
                    </div>
                  ) : (
                    <ConciergeCard onOpen={() => openLead("trapdoor", `No active matches at ${formatMoney(monthlyTarget)}/month with ${formatMoney(downPayment)} down over ${termMonths} months.`)} />
                  )}
                </div>
              </div>
            </div>

            <MasterFeed buyingPower={buyingPower} includedMakes={includedMakes} bodyType={bodyType} rejected={rejected} shortlisted={shortlisted} downPayment={downPayment} termMonths={termMonths} onOpen={openLead} />
          </div>
        ) : (
          <div role="tabpanel" className="mt-7 animate-slide-up">
            <div className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-400/15 via-slate-900 to-emerald-400/10 p-6 shadow-glow sm:p-9">
              <div className="absolute right-0 top-0 size-56 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
                <div className="max-w-3xl"><p className="eyebrow">There is a better exit</p><h3 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">Don&apos;t see your exact vehicle or price? Escape the traditional showroom grind entirely.</h3><p className="mt-3 leading-7 text-slate-300">Click here to let me source, negotiate, and deliver your perfect car directly to your garage.</p></div>
                <button onClick={() => openLead("trapdoor", "Concierge request from Traditional Browse banner.")} className="btn-primary shrink-0">Let me source it <ArrowRight size={17} /></button>
              </div>
            </div>
            <div className="mt-8 flex items-end justify-between gap-4"><div><p className="eyebrow">Representative inventory</p><h3 className="mt-2 text-3xl font-black text-white">Browse every vehicle</h3></div><p className="hidden max-w-md text-right text-xs leading-5 text-slate-500 md:block">Examples for matcher demonstration. I verify current vehicle, price, and availability before you make the trip.</p></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {inventory.map((vehicle) => <BrowseCard key={vehicle.id} vehicle={vehicle} monthly={estimatePayment(vehicle.price, downPayment, termMonths)} onOpen={() => openLead("retail", `Interested in ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}.`)} />)}
            </div>
          </div>
        )}
      </div>

      <LeadModal open={modal.open} trigger={modal.trigger} onClose={() => setModal((state) => ({ ...state, open: false }))} monthlyTarget={monthlyTarget} downPayment={downPayment} termMonths={termMonths} shortlistedVehicleIds={shortlisted} context={modal.context} />
    </section>
  );
}

function SliderControl({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-4"><span className="text-sm font-bold text-slate-200">{label}</span><span className="text-lg font-black text-white">{display}</span></span>
      <input type="range" className="range-track mt-4 w-full" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ background: `linear-gradient(to right, #f6a928 0%, #f6a928 ${progress}%, rgba(148,163,184,.22) ${progress}%, rgba(148,163,184,.22) 100%)` }} />
      <span className="mt-2 flex justify-between text-[10px] font-semibold text-slate-600"><span>{formatMoney(min)}</span><span>{formatMoney(max)}</span></span>
    </label>
  );
}

function VehicleSwipeCard({ vehicle, monthly, dragX }: { vehicle: Vehicle; monthly: number; dragX: number }) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-white/15 bg-slate-950 shadow-card">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={vehicle.image} alt={`Representative ${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill className="object-cover" priority sizes="(max-width: 768px) 90vw, 600px" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">{vehicle.type} · {vehicle.drivetrain}</div>
        {dragX > 20 && <div className="absolute right-5 top-6 rotate-12 rounded-lg border-4 border-emerald-300 px-4 py-2 text-2xl font-black uppercase tracking-widest text-emerald-200">Match</div>}
        {dragX < -20 && <div className="absolute left-5 top-6 -rotate-12 rounded-lg border-4 border-rose-300 px-4 py-2 text-2xl font-black uppercase tracking-widest text-rose-200">Pass</div>}
        <div className="absolute bottom-5 left-5 right-5"><p className="text-sm font-bold text-amber-300">{vehicle.accent}</p><h3 className="mt-1 text-3xl font-black tracking-tight text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-1 text-sm text-slate-300">{vehicle.trim} · {vehicle.mileage.toLocaleString()} miles</p></div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10">
        <div className="p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Vehicle price</p><p className="mt-1 text-xl font-black text-white">{formatMoney(vehicle.price)}</p></div>
        <div className="p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Est. payment</p><p className="mt-1 text-xl font-black text-emerald-300">~{formatMoney(monthly)}/mo</p></div>
      </div>
    </article>
  );
}

function ConciergeCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mx-auto flex min-h-[555px] max-w-xl flex-col items-center justify-center overflow-hidden rounded-[26px] border border-amber-400/25 bg-gradient-to-b from-amber-400/10 via-slate-950 to-emerald-400/10 px-6 py-10 text-center shadow-glow">
      <span className="grid size-16 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><Sparkles size={30} /></span>
      <p className="eyebrow mt-7">The broker trapdoor</p>
      <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">No active matches.<br />Good. Now I go to work.</h3>
      <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Out of stock on our lot, but not out of luck. Let me do the hard work for you. I will leverage our entire regional network to source your perfect vehicle, negotiate the best terms, and deliver it straight to your driveway.</p>
      <button onClick={onOpen} className="btn-primary mt-8">Let Me Work For You <ArrowRight size={18} /></button>
      <p className="mt-4 text-xs text-slate-500">No pressure. Just the spec, the number, and a direct line.</p>
    </div>
  );
}

interface MasterFeedProps {
  buyingPower: number;
  includedMakes: string[];
  bodyType: string;
  rejected: string[];
  shortlisted: string[];
  downPayment: number;
  termMonths: number;
  onOpen: (trigger: "retail" | "trapdoor", context?: string) => void;
}

function MasterFeed({ buyingPower, includedMakes, bodyType, rejected, shortlisted, downPayment, termMonths, onOpen }: MasterFeedProps) {
  return (
    <div className="mt-12">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">Persistent master feed</p><h3 className="mt-2 text-3xl font-black text-white">See what changed—and why.</h3></div><div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> Shortlisted</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-600" /> Dimmed by your choices</span></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inventory.map((vehicle) => {
          const reasons: string[] = [];
          if (vehicle.price > buyingPower) reasons.push("Over buying power");
          if (!includedMakes.includes(vehicle.make)) reasons.push("Brand excluded");
          if (bodyType !== "All" && vehicle.type !== bodyType) reasons.push(`${bodyType} filter active`);
          if (rejected.includes(vehicle.id)) reasons.push("Passed");
          const isShortlisted = shortlisted.includes(vehicle.id);
          const isDimmed = reasons.length > 0 && !isShortlisted;
          return <FeedCard key={vehicle.id} vehicle={vehicle} monthly={estimatePayment(vehicle.price, downPayment, termMonths)} reasons={reasons} shortlisted={isShortlisted} dimmed={isDimmed} onOpen={() => onOpen("retail", `Interested in ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}.`)} />;
        })}
      </div>
    </div>
  );
}

function FeedCard({ vehicle, monthly, reasons, shortlisted, dimmed, onOpen }: { vehicle: Vehicle; monthly: number; reasons: string[]; shortlisted: boolean; dimmed: boolean; onOpen: () => void }) {
  return (
    <article className={cn("group overflow-hidden rounded-2xl border bg-slate-900 transition duration-300", shortlisted ? "border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,.1)]" : "border-white/10", dimmed && "opacity-35 grayscale")}>
      <div className="relative aspect-[16/9] overflow-hidden"><Image src={vehicle.image} alt={`Representative ${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(max-width: 640px) 100vw, 33vw" />
        {shortlisted && <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-950"><Heart size={12} fill="currentColor" /> Shortlisted</span>}
        {dimmed && <span className="absolute inset-0 grid place-items-center bg-black/40"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-bold text-slate-300"><Ban size={14} /> {reasons[0]}</span></span>}
      </div>
      <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h4><p className="mt-1 text-xs text-slate-500">{vehicle.trim} · {vehicle.drivetrain}</p></div><p className="text-right text-sm font-black text-white">{formatMoney(vehicle.price)}</p></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"><p className="text-xs text-slate-500">~<strong className="text-emerald-300">{formatMoney(monthly)}/mo</strong></p><button onClick={onOpen} className="text-xs font-bold text-amber-300 hover:text-amber-200">Ask about it →</button></div></div>
    </article>
  );
}

function BrowseCard({ vehicle, monthly, onOpen }: { vehicle: Vehicle; monthly: number; onOpen: () => void }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
      <div className="relative aspect-[16/10] overflow-hidden"><Image src={vehicle.image} alt={`Representative ${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="(max-width: 640px) 100vw, 33vw" /><span className="absolute left-3 top-3 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 backdrop-blur">{vehicle.type}</span></div>
      <div className="p-5"><p className="text-xs font-bold text-amber-300">{vehicle.accent}</p><h4 className="mt-1 text-xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h4><p className="mt-1 text-sm text-slate-500">{vehicle.trim} · {vehicle.mileage.toLocaleString()} mi · {vehicle.drivetrain}</p><div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4"><div><p className="text-xl font-black text-white">{formatMoney(vehicle.price)}</p><p className="mt-1 text-xs text-emerald-300">~{formatMoney(monthly)}/mo estimated</p></div><button onClick={onOpen} className="grid size-10 place-items-center rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300" aria-label={`Ask about ${vehicle.make} ${vehicle.model}`}><ArrowRight size={17} /></button></div></div>
    </article>
  );
}
