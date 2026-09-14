import { FlaskConical, MessageSquareText, ShieldCheck } from "lucide-react";
import type { InventoryCatalog } from "@/lib/inventory-catalog";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrCustomerCatalog } from "@/lib/orr-customer-catalog";
import { brand } from "@/lib/brand";
import { AutoMatcher } from "./auto-matcher";
import { VerifiedLiveMatcher } from "./verified-live-matcher";

export async function RuntimeAutoMatcher() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") {
    return (
      <>
        <InventoryTruthBanner mode={runtime.effectiveMode} reason={runtime.reason} />
        <AutoMatcher />
      </>
    );
  }

  let catalog: InventoryCatalog | undefined;
  try {
    catalog = await loadOrrCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
  } catch (error) {
    console.error("NORAUTO_LIVE_INVENTORY_LOAD_FAILED", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown live inventory failure",
    });
    catalog = undefined;
  }

  return catalog ? <VerifiedLiveMatcher catalog={catalog} /> : <LiveInventoryUnavailable />;
}

function InventoryTruthBanner({ mode, reason }: { mode: "demo" | "live-shadow" | "live-enabled"; reason: string }) {
  const shadow = mode === "live-shadow";
  return (
    <div className="shell pt-8 sm:pt-12">
      <div className="mx-auto max-w-4xl rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300">{shadow ? <FlaskConical size={19} /> : <ShieldCheck size={19} />}</span>
          <div>
            <p className="text-sm font-black text-amber-200">{shadow ? "Inventory refresh in progress" : "Preview inventory mode"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{shadow
              ? "We’re checking the latest vehicle data before making it customer-visible. The vehicles below remain representative examples until verification is complete."
              : "The vehicles below are representative examples for the matcher experience, not a claim of current availability. Verified inventory requires the separate live activation gate."}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-600">runtime: {mode} · {reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveInventoryUnavailable() {
  return (
    <section id="matcher" className="scroll-mt-24 py-8 sm:py-12">
      <div className="shell">
        <div className="relative mx-auto max-w-4xl overflow-hidden border-y border-white/10 bg-black/20 px-1 py-8 sm:px-0 sm:py-10">
          <div className="absolute -left-20 top-10 h-4 w-56 -rotate-6 bg-red-600/90" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.3em] text-red-400">Verified inventory</p>
              <h2 className="mt-3 text-4xl font-black leading-[.86] tracking-[-.055em] text-white sm:text-6xl">NO VERIFIED<br />MATCH YET.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">We’re checking fresh inventory before putting a car in front of you. If the source cannot be verified, NorAuto Match stops here instead of showing stale or invented availability.</p>
            </div>
            <div className="grid gap-2 sm:flex lg:grid lg:min-w-[220px]">
              <a href={brand.textHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-black text-black"><MessageSquareText size={17} /> Tell me what you need</a>
              <a href="/how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-black text-white">How matching works</a>
            </div>
          </div>
          <p className="relative mt-5 text-[10px] font-black uppercase tracking-[.16em] text-white/35">Fresh units return automatically after the source passes verification.</p>
        </div>
      </div>
    </section>
  );
}
