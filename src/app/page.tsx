import Link from "next/link";
import { Search, ArrowRight, Heart, MessageSquareText } from "lucide-react";
import { HomeInventorySpotlight } from "@/components/inventory/home-inventory-spotlight";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <main className="min-h-screen bg-[#070b10] text-white">
    <section className="relative overflow-hidden border-b border-white/10 bg-[#05080d]">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(239,68,68,.12),transparent_35%),linear-gradient(125deg,#05080d,#0b1420_62%,#05080d)]" />
      <div className="shell relative grid min-h-[520px] items-center gap-10 py-16 lg:grid-cols-[1fr_.8fr] lg:py-24">
        <div>
          <p className="text-xs font-black uppercase tracking-[.25em] text-red-400">Car shopping, without the pressure</p>
          <h1 className="mt-6 text-[clamp(3.5rem,10vw,7rem)] font-black leading-[.82] tracking-[-.075em]">TELL ME<br />THE <span className="italic text-amber-300">NUMBER.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">Find your next car without the runaround. Search real inventory, see the details, and compare prices. No account needed.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/inventory" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-bold text-white">Browse all cars <ArrowRight size={16}/></Link>
            <a href={brand.textHref} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-bold text-white"><MessageSquareText size={16}/> Ask a salesperson</a>
          </div>
        </div>
        <form id="home-match" action="/find-my-car" method="get" className="rounded-[28px] border border-white/15 bg-white/[.055] p-5 shadow-2xl sm:p-7">
          <div className="flex items-center gap-3 text-amber-300"><Search size={22}/><h2 className="text-xl font-black">Find my match</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-400">What kind of car are you looking for?</p>
          <label htmlFor="home-vehicle-request" className="sr-only">Describe your car</label>
          <input id="home-vehicle-request" name="request" required minLength={4} maxLength={1200}
            className="mt-5 min-h-12 w-full rounded-xl border border-white/20 bg-[#101922] px-4 py-3 text-sm text-white placeholder:text-slate-500"
            placeholder="Example: white used Rogue under $25,000" />
          <button type="submit" className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-black">Find matching cars <ArrowRight size={17}/></button>
          <p className="mt-3 text-xs text-slate-500">No signup. No pressure. Price and availability require dealer confirmation.</p>
          <Link href="/find-my-car" className="mt-3 inline-block text-xs font-semibold text-slate-300 underline underline-offset-4">More search options, including photo preview</Link>
        </form>
      </div>
    </section>
    <HomeInventorySpotlight />
    <section className="border-t border-white/10 bg-[#0a1017] py-12">
      <div className="shell grid gap-5 sm:grid-cols-2 sm:items-center">
        <div><h2 className="text-2xl font-black">Save the cars you like.</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">Browse freely, compare the options, and sign in only when you want to keep your Garage across devices.</p></div>
        <div className="flex flex-wrap gap-3 sm:justify-end"><Link href="/garage" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-black text-black"><Heart size={16}/> My Garage</Link><Link href="/how-it-works" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-bold text-white">How it works</Link></div>
      </div>
    </section>
  </main>;
}
