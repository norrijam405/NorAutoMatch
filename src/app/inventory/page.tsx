import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { InteractiveInventory } from "@/components/inventory/interactive-inventory";
import { loadOrrCachedCustomerCatalog } from "@/lib/orr-cached-customer-catalog";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") return <InventoryUnavailable reason={runtime.reason} />;

  let catalog;
  try {
    catalog = await loadOrrCachedCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
  } catch (error) {
    console.error("NORAUTO_INVENTORY_PAGE_LOAD_FAILED", error instanceof Error ? error.message : String(error));
    return <InventoryUnavailable reason="verified-cache-unavailable" />;
  }

  return <main className="min-h-screen bg-[#070b10] py-8 sm:py-12"><div className="shell"><div className="mb-6 flex items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><ArrowLeft size={16} /> Home</Link><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-emerald-300"><ShieldCheck size={14} /> Verified cached inventory</div></div><InteractiveInventory vehicles={catalog.vehicles} fetchedAt={catalog.sourceEvidence?.fetchedAt} />

  {catalog.vehicles.length > 0 && <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.025] p-5 sm:p-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">Verified vehicle files</p><h2 className="mt-2 text-2xl font-black text-white">Open the full source-backed record.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Each VIN page shows only details preserved in the verified provider cache—pricing evidence, specs, photos and equipment when the source supplied them.</p></div><p className="text-xs font-black text-slate-600">{catalog.vehicles.length} records</p></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalog.vehicles.slice(0, 18).map((vehicle) => <Link key={vehicle.id} href={`/inventory/${encodeURIComponent(vehicle.vin ?? vehicle.id)}`} className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:border-amber-300/35"><span><span className="block text-sm font-black text-slate-200">{vehicle.year} {vehicle.make} {vehicle.model}</span><span className="mt-0.5 block text-[10px] text-slate-600">{vehicle.trim}{vehicle.stockNumber ? ` · Stock ${vehicle.stockNumber}` : ""}</span></span><ArrowRight size={15} className="shrink-0 text-amber-300 transition-transform group-hover:translate-x-1" /></Link>)}</div>{catalog.vehicles.length > 18 && <p className="mt-4 text-[11px] text-slate-600">Showing the first 18 verified detail records here. Inventory search above still covers the full eligible catalog.</p>}</section>}
  </div></main>;
}

function InventoryUnavailable({ reason }: { reason: string }) {
  return <main className="min-h-[70vh] bg-[#070b10] py-16"><div className="shell"><div className="relative mx-auto max-w-3xl overflow-hidden border-y border-white/10 py-10"><div className="absolute -left-20 top-10 h-4 w-56 -rotate-6 bg-red-600" /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Verified inventory</p><h1 className="mt-4 text-5xl font-black leading-[.85] tracking-[-.06em] text-white">FRESH INVENTORY<br />IS BEING VERIFIED.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">NorAuto Match will not turn a stale or unverified source into customer-facing inventory. Try again after the cache passes verification.</p><div className="mt-7 flex gap-3"><Link href="/" className="rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">Back home</Link><Link href="/#matcher" className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white">Tell me what you need</Link></div><p className="mt-5 text-[10px] uppercase tracking-[.15em] text-white/25">runtime reason: {reason}</p></div></div></div></main>;
}
