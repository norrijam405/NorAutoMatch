import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { InteractiveInventory } from "@/components/inventory/interactive-inventory";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") return <InventoryUnavailable reason={runtime.reason} />;

  let catalog;
  try {
    catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
  } catch (error) {
    console.error("NORAUTO_INVENTORY_PAGE_LOAD_FAILED", error instanceof Error ? error.message : String(error));
    return <InventoryUnavailable reason="verified-live-source-unavailable" />;
  }

  const supabase = await createClient();
  const { data: claimsResult } = await supabase.auth.getClaims();
  const userId = typeof claimsResult?.claims?.sub === "string" ? claimsResult.claims.sub : null;
  const { data: savedRows } = userId
    ? await supabase.from("saved_vehicles").select("vin").eq("user_id", userId)
    : { data: [] };
  const initialSavedVins = savedRows?.map((row) => row.vin) ?? [];

  const sourceLabel = catalog.source === "provider-cache" ? "Verified cached inventory" : "Verified live inventory";

  return <main className="min-h-screen bg-[#070b10] py-8 sm:py-12"><div className="shell"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap items-center gap-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><ArrowLeft size={16} /> Home</Link><Link href="/vehicles" className="text-sm font-black text-amber-300 hover:text-amber-200">Vehicle details →</Link></div><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-emerald-300"><ShieldCheck size={14} /> {sourceLabel}</div></div><InteractiveInventory vehicles={catalog.vehicles} fetchedAt={catalog.sourceEvidence?.fetchedAt} initialSavedVins={initialSavedVins} signedIn={Boolean(userId)} /></div></main>;
}

function InventoryUnavailable({ reason }: { reason: string }) {
  return <main className="min-h-[70vh] bg-[#070b10] py-16"><div className="shell"><div className="relative mx-auto max-w-3xl overflow-hidden border-y border-white/10 py-10"><div className="absolute -left-20 top-10 h-4 w-56 -rotate-6 bg-red-600" /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Verified inventory</p><h1 className="mt-4 text-5xl font-black leading-[.85] tracking-[-.06em] text-white">FRESH INVENTORY<br />IS BEING VERIFIED.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">NorAuto Match will not turn a stale or unverified source into customer-facing inventory. Try again after the dealer source passes verification.</p><div className="mt-7 flex gap-3"><Link href="/" className="rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">Back home</Link><Link href="/#matcher" className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white">Tell me what you need</Link></div><p className="mt-5 text-[10px] uppercase tracking-[.15em] text-white/25">runtime reason: {reason}</p></div></div></div></main>;
}
