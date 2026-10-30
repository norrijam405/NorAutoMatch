import Link from "next/link";
import { Search, ArrowRight, Heart } from "lucide-react";
import { HomeInventorySpotlight } from "@/components/inventory/home-inventory-spotlight";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <main className="min-h-screen bg-[#070b10] text-white">
    <section className="relative overflow-hidden border-b border-white/10 bg-[#05080d]">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,.11),transparent_55%)]" />
      <div className="shell relative mx-auto max-w-5xl py-9 text-center sm:py-12 lg:py-14">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-red-400 sm:text-xs">Car shopping, without the pressure</p>
        <h1 className="mt-3 text-[clamp(2.8rem,6vw,5rem)] font-black leading-[.94] tracking-[-.065em]">
          TELL ME THE <span className="italic text-amber-300">NUMBER.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
          Find real cars. Swipe what you like. Let Torque help you compare.
        </p>
        <form id="home-match" action="/find-my-car" method="get" className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/15 bg-white/[.055] p-2 shadow-xl sm:flex-row">
          <label htmlFor="home-vehicle-request" className="sr-only">Describe the car you want</label>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3">
            <Search size={18} className="shrink-0 text-amber-300" aria-hidden="true"/>
            <input id="home-vehicle-request" name="request" required minLength={4} maxLength={1200}
              className="min-h-12 w-full min-w-0 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-400"
              placeholder="Try: white used Rogue under $25,000" />
          </div>
          <button type="submit" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-black">
            Find cars <ArrowRight size={17}/>
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          No account required. <Link href="/find-my-car" className="text-slate-300 underline underline-offset-4">Advanced search</Link>
          {" · "}<Link href="/inventory" className="text-slate-300 underline underline-offset-4">Browse inventory</Link>
        </p>
      </div>
    </section>
    <HomeInventorySpotlight />
    <section className="border-t border-white/10 bg-[#0a1017] py-9">
      <div className="shell flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div>
          <h2 className="text-xl font-black">Found a favorite?</h2>
          <p className="mt-1 max-w-lg text-sm text-slate-400">Save cars across devices, then compare them in Garage Battle.</p>
        </div>
        <Link href="/garage" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-amber-300/50 px-5 text-sm font-black text-amber-300">
          <Heart size={16}/> My Garage
        </Link>
      </div>
    </section>
  </main>;
}
