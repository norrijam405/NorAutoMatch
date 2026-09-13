import { AlertTriangle, FlaskConical, ShieldCheck } from "lucide-react";
import type { InventoryCatalog } from "@/lib/inventory-catalog";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrCustomerCatalog } from "@/lib/orr-customer-catalog";
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
    <div className="shell pt-12">
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
    <section id="matcher" className="scroll-mt-24 py-16 sm:py-24">
      <div className="shell">
        <div className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center rounded-[30px] border border-amber-400/20 bg-amber-400/[.05] p-8 text-center sm:p-12">
          <span className="grid size-16 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><AlertTriangle size={30} /></span>
          <p className="eyebrow mt-7">Inventory refresh</p>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Fresh matches are being verified.</h2>
          <p className="mt-5 max-w-2xl leading-7 text-slate-300">We’re checking the latest vehicle data before showing it here. Rather than display stale or unverified inventory, NorAuto Match will reopen this section when the current snapshot passes verification.</p>
          <p className="mt-5 text-sm font-bold text-amber-200">Please check back shortly.</p>
        </div>
      </div>
    </section>
  );
}
