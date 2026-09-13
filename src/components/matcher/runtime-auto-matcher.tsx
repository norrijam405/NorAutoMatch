import { AlertTriangle, FlaskConical, MessageSquareText, ShieldCheck } from "lucide-react";
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
  } catch {
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
    <section id="matcher" className="scroll-mt-24 py-10 sm:py-20">
      <div className="shell">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-[24px] border border-amber-400/20 bg-amber-400/[.05] p-5 sm:rounded-[30px] sm:p-10">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300 sm:size-14 sm:rounded-2xl"><AlertTriangle size={24} /></span>
            <div className="min-w-0">
              <p className="eyebrow">Inventory refresh</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.03em] text-white sm:text-4xl">Fresh matches are being verified.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">We’re checking the latest vehicle data before showing it here. NorAuto Match would rather pause the row than show stale or unverified availability.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:mt-7 sm:flex">
            <a href={brand.textHref} className="btn-primary justify-center"><MessageSquareText size={17} /> Tell me what you need</a>
            <a href="/how-it-works" className="btn-secondary justify-center">See how matching works</a>
          </div>
          <p className="mt-4 text-center text-[11px] font-semibold text-amber-200/80 sm:text-left">Verified inventory will return here automatically when the current snapshot passes checks.</p>
        </div>
      </div>
    </section>
  );
}
