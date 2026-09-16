import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/inventory";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  try {
    const catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });

    return <main className="min-h-screen bg-[#070b10] py-8 sm:py-12">
      <div className="shell">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/inventory" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><ArrowLeft size={16} /> Inventory playground</Link>
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-emerald-300"><ShieldCheck size={14} /> {catalog.vehicles.length} verified eligible VINs</span>
        </div>
        <div className="mt-10 max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Vehicle detail desk</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-.055em] text-white sm:text-7xl">THE CARS.<br /><span className="text-red-500">WITHOUT THE GUESSING.</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">Every card below is tied to a verified live VIN from the authorized Orr Nissan West inventory boundary. Specs shown here come from source evidence; missing fields stay missing.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.vehicles.map((vehicle) => <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`} className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#0d131b] transition hover:-translate-y-0.5 hover:border-amber-300/30">
            <div className="aspect-[16/9] overflow-hidden bg-[#111923]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /></div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300">Verified VIN</p><h2 className="mt-2 text-xl font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h2><p className="mt-1 text-xs text-slate-500">{vehicle.trim}</p></div><ArrowUpRight size={18} className="text-slate-600 transition group-hover:text-amber-300" /></div>
              <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-2xl font-black text-white">{formatMoney(vehicle.price)}</p><p className="mt-1 text-[10px] text-slate-600">advertised source price</p></div><p className="text-right text-xs leading-5 text-slate-400">{vehicle.mileage.toLocaleString()} mi<br />{vehicle.drivetrain}</p></div>
            </div>
          </Link>)}
        </div>
        {catalog.sourceEvidence?.fetchedAt && <p className="mt-8 text-[10px] uppercase tracking-[.14em] text-white/25">Dealer source checked {new Date(catalog.sourceEvidence.fetchedAt).toLocaleString()} · source {catalog.source}</p>}
      </div>
    </main>;
  } catch (error) {
    console.error("NORAUTO_VEHICLES_PAGE_LOAD_FAILED", error instanceof Error ? error.message : String(error));
    return <main className="min-h-[70vh] bg-[#070b10] py-20"><div className="shell"><p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Vehicle detail desk</p><h1 className="mt-4 text-5xl font-black text-white">LIVE SOURCE<br />NOT VERIFIED.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">NorAuto Match is refusing to manufacture a catalog while the dealer source cannot pass verification.</p><Link href="/" className="mt-7 inline-flex rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">Back home</Link></div></main>;
  }
}
