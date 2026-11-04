import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { HomeHeroSwipe } from "@/components/inventory/home-hero-swipe";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

export async function HomeInventorySpotlight() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") return <InventoryUnavailable />;

  try {
    const catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });

    if (!catalog.customerVisibleLiveInventory || catalog.source === "demo" || catalog.vehicles.length === 0) {
      return <InventoryUnavailable />;
    }

    const sourceLabel = catalog.source === "provider-cache" ? "Verified cached inventory" : "Verified live inventory";

    return (
      <section id="matcher" className="scroll-mt-24 border-b border-white/10 bg-[#070b10] py-12 sm:py-20">
        <div className="shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-emerald-300">
              <ShieldCheck size={15} /> {sourceLabel}
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.055em] text-white sm:text-6xl">
              SWIPE YOUR WAY <span className="text-red-500">TO THE ONE.</span>
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base">
              Keep what you love. Pass on what you don't. Hit Mix for something different.
              Open any car's details before deciding.
            </p>
          </div>
          <div className="mt-9 flex justify-center">
            <HomeHeroSwipe
              vehicles={catalog.vehicles}
              sourceLabel={sourceLabel}
              sourceCount={catalog.vehicles.length}
            />
          </div>
          <div className="mt-7 flex justify-center">
            <Link href="/inventory" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-bold text-white hover:border-amber-300/50">
              Prefer to browse? View all inventory <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    console.error("NORAUTO_HOME_SWIPE_FAILED", error instanceof Error ? error.message : String(error));
    return <InventoryUnavailable />;
  }
}

function InventoryUnavailable() {
  return (
    <section id="matcher" className="scroll-mt-24 border-b border-white/10 bg-[#070b10] py-12">
      <div className="shell mx-auto max-w-2xl text-center">
        <p className="text-xs font-black uppercase tracking-[.2em] text-red-400">SwipeMatch</p>
        <h2 className="mt-3 text-3xl font-black text-white">Fresh cars are being verified.</h2>
        <p className="mt-3 text-sm text-slate-400">
          SwipeMatch will return when verified inventory is available. We won't show made-up cars.
        </p>
        <Link href="/inventory" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-bold text-white">
          Check inventory <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
