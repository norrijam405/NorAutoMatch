import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, BadgeCheck, CarFront, MessageCircle } from "lucide-react";
import { TorqueChat } from "@/components/torque/torque-chat";
import { ShopJourneyNav } from "@/components/site/shop-journey-nav";
import { canUseTorquePreviewVerifiedCatalog } from "@/lib/torque-standalone-demo";

export const metadata: Metadata = {
  title: "Ask Torque | NorAutoMatch",
  description: "Talk through car choices, explore vehicle-listing evidence, and compare verified catalog examples.",
};

export default async function AskTorquePage({
  searchParams,
}: {
  searchParams: Promise<{ vin?: string }>;
}) {
  const params = await searchParams;
  const vin = typeof params.vin === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(params.vin)
    ? params.vin.toUpperCase()
    : null;
  const initialPrompt = vin ? `What can you verify about VIN ${vin}? Show what is in the checked dealer records and what still needs confirmation.` : "";
  return <div className="min-h-screen bg-[#070b10] text-white">
    <div className="shell max-w-6xl pb-12 pt-7 sm:pt-10">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-amber-200">
        <ArrowLeft size={15} /> Back to NorAutoMatch
      </Link>
      <div className="mt-6"><ShopJourneyNav current="torque" /></div>
      <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-300">Your vehicle research workspace</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-6xl">ASK <span className="text-amber-300">TORQUE.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Tell Torque what you need, change your mind, compare two specific vehicles, and inspect the details behind each catalog recommendation. No login required to ask.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-slate-200"><MessageCircle size={14} /> Conversational search</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-slate-200"><ArrowLeftRight size={14} /> Garage Battle</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-slate-200"><BadgeCheck size={14} /> Source disclosures</span>
        </div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <TorqueChat mode="workspace" initialPrompt={initialPrompt} allowVerifiedPreview={canUseTorquePreviewVerifiedCatalog()} />
        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.035] p-5">
            <div className="flex items-center gap-2 text-sm font-black text-amber-200"><CarFront size={18} /> What Torque can check</div>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              Vehicle listings in the available dealer catalog, specific customer requirements, recorded equipment, prices, mileage and evidence gaps.
            </p>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-200">Keep your expectations clear</p>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              A dealer listing is not a promise that a vehicle is still available. Demonstration inventory is labeled separately. Torque cannot independently confirm financing, appointments, or vehicle reservations.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-xs font-bold">
              <Link href="/inventory" className="rounded-xl border border-white/15 px-4 py-3 text-amber-300 hover:border-amber-300/40">Browse verified inventory</Link>
              <Link href="/find-my-car" className="rounded-xl border border-white/15 px-4 py-3 text-amber-300 hover:border-amber-300/40">Find my car</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </div>;
}
