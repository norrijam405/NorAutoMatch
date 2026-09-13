"use client";

import Link from "next/link";
import { Menu, MessageSquareText, Phone, X } from "lucide-react";
import { useState } from "react";
import { brand } from "@/lib/brand";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label="NorAuto Match home">
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 sm:size-10">
        <span className="h-2.5 w-5 -rotate-45 border-b-[3px] border-l-[3px] border-amber-300" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block text-[15px] font-black tracking-tight text-white sm:text-base">NorAuto Match</span>
        <span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[.11em] text-amber-300 sm:text-[9px]">Car shopping, without the pressure</span>
      </span>
    </Link>
  );
}

const links = [
  { href: "/#matcher", label: "Find my match" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/areas/mustang", label: "Service areas" },
  { href: "/terms", label: "Disclosures" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#071018]/85 backdrop-blur-xl">
      <div className="shell flex h-[66px] items-center justify-between sm:h-[74px]">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-300 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <a href={brand.textHref} className="btn-secondary min-h-10 px-4 py-2"><MessageSquareText size={16} /> Text me</a>
          <a href={`tel:${brand.phoneRaw}`} className="btn-primary min-h-10 px-4 py-2"><Phone size={16} /> {brand.phoneDisplay}</a>
        </div>
        <button className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-4 md:hidden">
          <nav className="shell flex flex-col gap-1.5">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-semibold text-slate-200 hover:bg-white/5">{link.label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={brand.textHref} className="btn-secondary min-h-11"><MessageSquareText size={16} /> Text</a>
              <a href={`tel:${brand.phoneRaw}`} className="btn-primary min-h-11"><Phone size={16} /> Call</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
