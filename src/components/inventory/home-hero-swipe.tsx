"use client";

import Link from "next/link";
import { Check, Heart, Shuffle, X } from "lucide-react";
import { useState } from "react";
import type { Vehicle } from "@/lib/inventory";

type Props = {
  vehicles: Vehicle[];
  sourceLabel: string;
  sourceCount: number;
  inTransitCount?: number;
};

export function HomeHeroSwipe({ vehicles, sourceLabel, sourceCount, inTransitCount = 0 }: Props) {
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState<string[]>([]);

  if (vehicles.length === 0) return <HeroUnavailable />;

  const current = vehicles[index % vehicles.length];

  function advance() {
    setIndex((value) => value + 1);
  }

  function keepCurrent() {
    setKept((currentKept) => currentKept.includes(current.id) ? currentKept : [...currentKept, current.id]);
    advance();
  }

  return (
    <div className="relative mx-auto w-full max-w-[430px] lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-5 rounded-[38px] bg-red-500/[.07] blur-2xl" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-black/55 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-emerald-300">Live SwipeMatch</p>
            <p className="mt-1 text-[11px] text-white/45">{sourceLabel} · {sourceCount} source units</p>
          </div>
          <div className="text-right text-[10px] text-white/40">
            <p>{index % vehicles.length + 1} / {vehicles.length} quick deck</p>
            {inTransitCount > 0 && <p>{inTransitCount} in transit included</p>}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-[#111923]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.image} alt={`${current.year} ${current.make} ${current.model}`} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5 pt-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300">Verified VIN</p>
                <h2 className="mt-1 text-2xl font-black leading-none text-white">{current.year} {current.make} {current.model}</h2>
                <p className="mt-2 text-xs text-white/60">{current.trim} · {current.drivetrain}{current.inTransit ? " · In transit" : ""}</p>
              </div>
              <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/65">{current.type}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={advance} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 text-xs font-black text-rose-200"><X size={17} /> Pass</button>
            <button onClick={keepCurrent} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-xs font-black text-emerald-200"><Heart size={16} /> Keep</button>
            <button onClick={advance} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 text-xs font-black text-amber-200"><Shuffle size={15} /> Next</button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/vehicles/${current.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-300 px-3 text-xs font-black text-black">Open exact VIN</Link>
            <Link href="/inventory" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-xs font-black text-white">Full playground</Link>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-white/35">
            <span>VIN {current.id}</span>
            <span className="inline-flex items-center gap-1"><Check size={11} /> {kept.length} kept this session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroUnavailable() {
  return <div className="mx-auto max-w-[430px] rounded-[30px] border border-white/10 bg-black/45 p-6 text-center backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.22em] text-red-400">Verified inventory</p><h2 className="mt-3 text-2xl font-black text-white">Fresh VINs are being verified.</h2><p className="mt-3 text-sm leading-6 text-white/45">NorAuto will not fill this card with invented inventory.</p><Link href="/inventory" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-xs font-black text-white">Check inventory</Link></div>;
}
