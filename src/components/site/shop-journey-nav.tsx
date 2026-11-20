import Link from "next/link";
import { ArrowRight, Bot, Heart, Search } from "lucide-react";

const stops = [
  { href: "/find-my-car", label: "Find", icon: Search },
  { href: "/ask-torque", label: "Ask Torque", icon: Bot },
  { href: "/garage", label: "Compare", icon: Heart },
] as const;

/** Noninteractive journey guide. Does not navigate automatically or track users. */
export function ShopJourneyNav({ current }: { current: "find" | "torque" | "garage" }) {
  const activeIndex = { find: 0, torque: 1, garage: 2 }[current];
  return <nav aria-label="Shopping journey" className="flex flex-wrap items-center gap-2">
    {stops.map((stop, index) => {
      const Icon = stop.icon;
      const selected = index === activeIndex;
      return <span key={stop.href} className="inline-flex items-center gap-2">
        {index > 0 && <ArrowRight size={12} className="hidden text-slate-600 sm:block" aria-hidden="true"/>}
        <Link href={stop.href} aria-current={selected ? "step" : undefined}
          className={selected
            ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/[.09] px-4 text-xs font-black text-amber-200"
            : "inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 text-xs font-bold text-slate-300 hover:border-white/30 hover:text-white"}>
          <Icon size={15} /> {stop.label}
        </Link>
      </span>;
    })}
  </nav>;
}
