import { AlertTriangle, FlaskConical, ShieldCheck } from "lucide-react";
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

  try {
    const catalog = await loadOrrCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
    return <VerifiedLiveMatcher catalog={catalog} />;
  } catch {
    return <LiveInventoryUnavailable />;
  }
}

function InventoryTruthBanner({ mode, reason }: { mode: "demo" | "live-shadow" | "live-enabled"; reason: string }) {
  const shadow = mode === "live-shadow";
  return (
    <div className="shell pt-12">
      <div className="mx-auto max-w-4xl rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300">{shadow ? <FlaskConical size={19} /> : <ShieldCheck size={19} />}</span>
          <div>
            <p className="text-sm font-black text-amber-200">{shadow ? "Live inventory is being verified in shadow mode" : "Representative matcher inventory"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{shadow
              ? "The public Orr inventory pipeline can be evaluated behind the scenes, but it is not allowed to replace the customer-visible catalog in this mode. The vehicles below remain representative examples."
              : "The vehicles below are representative examples for the matcher experience, not a claim of current lot availability. Live customer inventory requires the separate explicit activation gate."}</p>
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
        <div className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center rounded-[30px] border border-rose-400/25 bg-rose-400/[.05] p-8 text-center sm:p-12">
          <span className="grid size-16 place-items-center rounded-2xl border border-rose-400/25 bg-rose-400/10 text-rose-300"><AlertTriangle size={30} /></span>
          <p className="eyebrow mt-7">Inventory verification unavailable</p>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">I won&apos;t show demo cars and pretend they are live.</h2>
          <p className="mt-5 max-w-2xl leading-7 text-slate-300">The live inventory mode was explicitly activated, but the current Orr Nissan West source could not be verified strongly enough to present vehicle availability. The matcher is intentionally closed until a trustworthy snapshot is available again.</p>
          <p className="mt-5 text-sm font-bold text-rose-200">No customer-visible inventory substitution occurred.</p>
        </div>
      </div>
    </section>
  );
}
