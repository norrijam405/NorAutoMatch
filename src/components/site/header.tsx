"use client";

import Link from "next/link";
import { LogIn, LogOut, Menu, MessageSquareText, Phone, X } from "lucide-react";
import { useState } from "react";
import { brand } from "@/lib/brand";
import { NAM_BADGE_DATA_URI } from "@/lib/brand-images";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label="NorAuto Match home">
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-red-500/20 bg-black/35 shadow-[0_0_24px_rgba(239,68,68,.08)] sm:size-11">
        <img src={NAM_BADGE_DATA_URI} alt="" className="size-full object-contain" />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block text-[15px] font-black tracking-tight text-white sm:text-base">NorAuto Match</span>
        <span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[.11em] text-red-300 sm:text-[9px]">Car shopping, without the pressure</span>
      </span>
    </Link>
  );
}

const links = [
  { href: "/#matcher", label: "Find my match" },
  { href: "/inventory", label: "Inventory" },
  { href: "/garage", label: "Garage" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/terms", label: "Disclosures" },
];

export function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#071018]/85 backdrop-blur-xl">
      <div className="shell flex h-[66px] items-center justify-between sm:h-[74px]">
        <Logo />
        <nav className="hidden items-center gap-5 md:flex" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-300 hover:text-white">{link.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {isAuthenticated ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-black text-white hover:border-red-300/50 hover:text-red-200"><LogOut size={16} /> Sign out</button>
            </form>
          ) : (
            <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-black text-white hover:border-red-300/50 hover:text-red-200"><LogIn size={16} /> Sign in</Link>
          )}
          <a href={brand.textHref} className="btn-secondary min-h-10 px-4 py-2"><MessageSquareText size={16} /> Text me</a>
          <a href={`tel:${brand.phoneRaw}`} className="btn-primary min-h-10 px-4 py-2"><Phone size={16} /> {brand.phoneDisplay}</a>
        </div>
        <button className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {open && <div className="border-t border-white/10 bg-slate-950 px-4 py-4 md:hidden"><nav className="shell flex flex-col gap-1.5">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-semibold text-slate-200 hover:bg-white/5">{link.label}</Link>)}{isAuthenticated ? <form action="/auth/signout" method="post" className="mt-2"><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-300/10 px-4 font-black text-red-200"><LogOut size={16} /> Sign out</button></form> : <Link href="/login" onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-300/10 px-4 font-black text-red-200"><LogIn size={16} /> Sign in / Create account</Link>}<div className="mt-3 grid grid-cols-2 gap-2"><a href={brand.textHref} className="btn-secondary min-h-11"><MessageSquareText size={16} /> Text</a><a href={`tel:${brand.phoneRaw}`} className="btn-primary min-h-11"><Phone size={16} /> Call</a></div></nav></div>}
    </header>
  );
}
