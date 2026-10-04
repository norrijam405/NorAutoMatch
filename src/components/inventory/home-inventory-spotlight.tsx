import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Shuffle } from "lucide-react";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

export async function HomeInventorySpotlight() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") {
    return <InventoryTeaserUnavailable />;
  }

  let catalog;
  try {
    catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
  } catch (error) {
    console.error("NORAUTO_HOME_INVENTORY_SPOTLIGHT_FAILED", error instanceof Error ? error.message : String(error));
    return <InventoryTeaserUnavailable />;
  }

  const vehicles = catalog.vehicles.slice(0, 8);
  const sourceLabel = catalog.source === "provider-cache" ? "Verified cached inventory" : "Verified live inventory";
  const unitLabel = catalog.source === "provider-cache" ? "Verified cached" : "Verified live";
  const refreshLabel = catalog.source === "provider-cache" ? "Cache refreshed" : "Dealer source checked";

  return (
    <section id="matcher" className="scroll-mt-24 bg-[#070b10] py-10 sm:py-14">
      <div className="shell">
        <div className="rounded-[30px] border border-white/10 bg-white/[.025] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-emerald-300"><ShieldCheck size={14} /> {sourceLabel}</div>
              <h2 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.055em] text-white sm:text-6xl">A QUICK LOOK.<br /><span className="text-red-500">NOT A WALL OF CARS.</span></h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">Browse a few fresh units here, then open the full inventory playground to search naturally, shortlist, SwipeMatch, compare, and keep building your Garage.</p>
            </div>
            <div className="text-xs text-slate-500 lg:text-right">
              <p>{catalog.vehicles.length} verified eligible units</p>
              {catalog.sourceEvidence?.fetchedAt && <p>{refreshLabel} {new Date(catalog.sourceEvidence.fetchedAt).toLocaleString()}</p>}
            </div>
          </div>

          <div className="mt-6 -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {vehicles.map((vehicle) => (
              <Link href={`/vehicles/${vehicle.id}`} key={vehicle.id} className="w-[78vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/10 bg-[#0d131b] transition hover:border-amber-300/30 sm:w-[300px]">
                <div className="aspect-[16/9] overflow-hidden bg-[#111923]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">{unitLabel}</p>
                  <h3 className="mt-2 text-lg font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{vehicle.trim} · {vehicle.drivetrain}{vehicle.exteriorColor ? ` · ${vehicle.exteriorColor}` : ""}</p>
                  <p className="mt-3 text-[11px] text-slate-600">Open the VIN detail record →</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/vehicles" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black"><Search size={17} /> Browse vehicle details</Link>
            <Link href="/inventory" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/35 bg-red-500/[.08] px-6 text-sm font-black text-red-200"><Shuffle size={17} /> Start SwipeMatch</Link>
            <Link href="/inventory" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-black text-white">Open inventory playground <ArrowRight size={17} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function InventoryTeaserUnavailable() {
  return (
    <section id="matcher" className="scroll-mt-24 bg-[#070b10] py-10 sm:py-14">
      <div className="shell">
        <div className="relative overflow-hidden border-y border-white/10 py-8">
          <div className="absolute -left-20 top-8 h-4 w-56 -rotate-6 bg-red-600" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-red-400">Verified inventory</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.05em] text-white">Fresh inventory is being verified.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">NorAuto does not fill this space with stale or invented units. Live inventory returns when the dealer source passes verification.</p>
            <Link href="/inventory" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-black text-white">Check inventory <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
