"use client";

import Link from "next/link";
import { Bot, CarFront, Heart, LogIn, LogOut, Menu, MessageSquareText, Search, X } from "lucide-react";
import { useState } from "react";
import { brand } from "@/lib/brand";
import { NAM_BADGE_DATA_URI } from "@/lib/brand-images";

const links = [
  { href: "/find-my-car", label: "Find a car", icon: Search },
  { href: "/ask-torque", label: "Ask Torque", icon: Bot },
  { href: "/inventory", label: "Browse cars", icon: CarFront },
  { href: "/garage", label: "My Garage", icon: Heart },
];

export function Logo() {
  return <Link href="/" className="inline-flex min-w-0 items-center gap-2.5" aria-label="NorAutoMatch home">
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-red-500/25 bg-[#090e16] sm:size-11">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={NAM_BADGE_DATA_URI} alt="" className="size-full object-contain" />
    </span>
    <span className="min-w-0 leading-none">
      <span className="block text-[15px] font-black tracking-tight text-white sm:text-base">NorAuto<span className="text-amber-300">Match</span></span>
      <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-[.09em] text-slate-400">Shop smarter. No pressure.</span>
    </span>
  </Link>;
}

export function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090f16]/95 backdrop-blur-xl">
    <div className="shell flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
      <Logo />
      <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Primary navigation">
        {links.map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-slate-300 hover:bg-white/[.06] hover:text-white">{link.label}</Link>)}
      </nav>
      <div className="ml-auto hidden items-center gap-2 sm:flex lg:ml-0">
        <a href={brand.textHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-bold text-white hover:border-amber-300/40">
          <MessageSquareText size={16}/> Text me
        </a>
        <Link href="/ask-torque" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 hover:bg-amber-200"><Bot size={16}/> Ask Torque</Link>
      </div>
      <button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 text-white lg:hidden"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="norauto-mobile-nav">
        {open ? <X size={21}/> : <Menu size={21}/>}
      </button>
    </div>
    {open && <div id="norauto-mobile-nav" className="border-t border-white/10 bg-[#0b131d] lg:hidden">
      <nav className="shell grid gap-1 py-4" aria-label="Mobile navigation">
        {links.map(link => {
          const Icon = link.icon;
          return <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
            className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold text-slate-200 hover:bg-white/[.06]">
            <Icon size={18} className="text-amber-300"/>{link.label}
          </Link>;
        })}
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
          <a href={brand.textHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 text-xs font-black text-white"><MessageSquareText size={16}/> Text me</a>
          {isAuthenticated
            ? <form action="/auth/signout" method="post"><button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 text-xs font-black text-white"><LogOut size={16}/> Sign out</button></form>
            : <Link href="/login" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 text-xs font-black text-white"><LogIn size={16}/> Sign in</Link>}
        </div>
        <p className="mt-3 px-3 text-[11px] text-slate-500">Sales and final vehicle details through {brand.dealer.name}.</p>
      </nav>
    </div>}
  </header>;
}
