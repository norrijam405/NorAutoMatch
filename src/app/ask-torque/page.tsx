import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
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
      <div className="mt-7 max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Car shopping made easier</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Talk cars with <span className="text-amber-300">Torque.</span></h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Tell me what you're looking for. We can compare options, change your mind, and figure out what to check next.</p>
      </div>
      <div className="mt-6 mx-auto max-w-4xl">
        <TorqueChat mode="workspace" initialPrompt={initialPrompt} allowVerifiedPreview={canUseTorquePreviewVerifiedCatalog()} />
        <details className="mt-4 rounded-xl border border-white/10 bg-white/[.02] p-4">
          <summary className="cursor-pointer text-xs font-bold text-slate-300">About inventory sources and what Torque can verify</summary>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            Torque uses available dealer listings and identifies missing details. Listed prices, equipment and availability can change; a salesperson should confirm the exact vehicle. Sample inventory is labeled. Nothing is reserved or financed by this chat.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
            <Link href="/inventory" className="text-amber-300 hover:underline">Browse inventory</Link>
            <Link href="/find-my-car" className="text-amber-300 hover:underline">Find my car</Link>
          </div>
        </details>
      </div>
    </div>
  </div>;
}
