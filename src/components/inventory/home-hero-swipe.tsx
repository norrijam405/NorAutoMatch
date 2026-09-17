"use client";

import Link from "next/link";
import { CarFront, Check, Heart, Shuffle, Sparkles, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { Vehicle } from "@/lib/inventory";
import { recordMatchDnaSignal, saveVehicleToGarage } from "@/app/garage/actions";

type Props = {
  vehicles: Vehicle[];
  sourceLabel: string;
  sourceCount: number;
  inTransitCount?: number;
};

type SwipeAction = "pass" | "keep" | "next";

export function HomeHeroSwipe({ vehicles, sourceLabel, sourceCount, inTransitCount = 0 }: Props) {
  const [deck, setDeck] = useState(vehicles);
  const [kept, setKept] = useState<string[]>([]);
  const [seen, setSeen] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const current = deck[0];
  const sessionLabel = useMemo(() => {
    if (kept.length === 0) return "Exploring broadly";
    return "Adapting to this session";
  }, [kept.length]);

  if (!current) return <HeroUnavailable />;

  function act(action: SwipeAction) {
    const actedOn = current;

    if (action === "keep") {
      setKept((currentKept) => currentKept.includes(actedOn.id) ? currentKept : [...currentKept, actedOn.id]);
      setSaveNotice("Saving this Keep to your Garage…");
      startSaving(async () => {
        const result = await saveVehicleToGarage(actedOn.id, "home_swipematch", "keep");
        if (result.ok) {
          setSaveNotice(result.scoutQueued
            ? "Saved to Garage · Market Scout queued"
            : "Saved to Garage");
        } else if (result.authRequired) {
          setSaveNotice("Kept for this session · sign in to save it to Garage");
        } else {
          setSaveNotice("Kept for this session · Garage save needs another try");
        }
      });
    } else {
      startSaving(async () => {
        await recordMatchDnaSignal(actedOn.id, action === "pass" ? "pass" : "mix", "home_swipematch");
      });
    }

    setDeck((currentDeck) => rerankRemaining(currentDeck, actedOn, action));
    setSeen((value) => value + 1);
  }

  return (
    <div className="relative mx-auto w-full max-w-[470px] lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-6 rounded-[42px] bg-red-500/[.08] blur-3xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#07090d]/95 shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-emerald-300" />
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">Live SwipeMatch</p>
            </div>
            <p className="mt-1 text-[11px] text-white/45">{sourceLabel} · {sourceCount} source units</p>
          </div>
          <div className="text-right text-[10px] leading-5 text-white/40">
            <p>{seen + 1} viewed</p>
            <p>{sessionLabel}</p>
          </div>
        </div>

        <div className="relative aspect-[16/11] overflow-hidden bg-[#111923]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.image} alt={`${current.year} ${current.make} ${current.model}`} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent p-4 pb-14">
            <span className="rounded-full border border-emerald-300/20 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-emerald-200 backdrop-blur">Verified VIN</span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {current.inTransit && <span className="rounded-full border border-amber-300/30 bg-black/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-amber-200 backdrop-blur">In transit</span>}
              <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/65 backdrop-blur">{current.type}</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-5 pt-24">
            <h2 className="text-[1.75rem] font-black leading-[.95] tracking-[-.035em] text-white sm:text-3xl">{current.year} {current.make} {current.model}</h2>
            <p className="mt-2 text-sm font-bold text-white/65">{current.trim} · {current.drivetrain}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.08em] text-white/55">
              {Number.isFinite(current.price) && current.price > 0 && <span className="rounded-full border border-white/10 bg-white/[.06] px-2.5 py-1">${Math.round(current.price).toLocaleString()}</span>}
              {Number.isFinite(current.mileage) && <span className="rounded-full border border-white/10 bg-white/[.06] px-2.5 py-1">{current.mileage.toLocaleString()} mi</span>}
              {current.exteriorColor && <span className="rounded-full border border-white/10 bg-white/[.06] px-2.5 py-1">{current.exteriorColor}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2.5">
            <button onClick={() => act("pass")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 text-xs font-black text-rose-200 transition hover:bg-rose-400/15"><X size={18} /> Pass</button>
            <button onClick={() => act("keep")} disabled={isSaving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-xs font-black text-emerald-200 transition hover:bg-emerald-400/15 disabled:opacity-60"><Heart size={17} /> Keep</button>
            <button onClick={() => act("next")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-300/10 text-xs font-black text-amber-200 transition hover:bg-amber-300/15"><Shuffle size={16} /> Mix</button>
          </div>

          {saveNotice && <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-[10px] text-white/55"><span>{saveNotice}</span>{saveNotice.includes("sign in") && <Link href="/login?next=%2Fgarage" className="shrink-0 font-black text-amber-300">Sign in</Link>}</div>}

          <div className="grid grid-cols-[1.15fr_.85fr] gap-2.5">
            <Link href={`/vehicles/${current.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 text-xs font-black text-black shadow-[0_0_24px_rgba(252,211,77,.12)]"><CarFront size={16} /> Full details</Link>
            <Link href="/garage" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[.03] px-4 text-xs font-black text-white"><Heart size={15} /> Garage</Link>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[10px] text-white/35">
            <span className="truncate">VIN {current.id}</span>
            <span className="inline-flex shrink-0 items-center gap-1"><Check size={11} /> {kept.length} kept this session</span>
          </div>
          {inTransitCount > 0 && <p className="text-center text-[9px] uppercase tracking-[.14em] text-white/25">{inTransitCount} in-transit units remain eligible for discovery</p>}
        </div>
      </div>
    </div>
  );
}

function rerankRemaining(deck: Vehicle[], current: Vehicle, action: SwipeAction) {
  const remaining = deck.filter((vehicle) => vehicle.id !== current.id);
  if (remaining.length === 0) return [];

  return remaining
    .map((vehicle) => ({ vehicle, score: sessionScore(vehicle, current, action) + Math.random() * 1.5 }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.vehicle);
}

function sessionScore(vehicle: Vehicle, current: Vehicle, action: SwipeAction) {
  const sameMake = vehicle.make === current.make;
  const sameModel = sameMake && vehicle.model === current.model;
  const sameType = vehicle.type === current.type;
  const sameCondition = vehicle.condition === current.condition;
  const differentMake = !sameMake;

  if (action === "keep") {
    return (sameType ? 4 : 0) + (sameMake ? 1.5 : 0) + (sameCondition ? 0.75 : 0) - (sameModel ? 5 : 0);
  }

  if (action === "pass") {
    return (differentMake ? 3.5 : 0) + (!sameType ? 2 : 0) - (sameModel ? 8 : 0) - (sameMake ? 2 : 0);
  }

  return (differentMake ? 2 : 0) + (!sameModel ? 2 : 0) + (!sameType ? 1 : 0);
}

function HeroUnavailable() {
  return <div className="mx-auto max-w-[470px] rounded-[32px] border border-white/10 bg-black/45 p-6 text-center backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">Verified inventory</p><h2 className="mt-3 text-2xl font-black text-white">Fresh VINs are being verified.</h2><p className="mt-3 text-sm leading-6 text-white/45">NorAuto will not fill this card with invented inventory.</p><Link href="/inventory" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-xs font-black text-white">Check inventory</Link></div>;
}
