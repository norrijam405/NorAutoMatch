import type { Metadata } from "next";
import Link from "next/link";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";
import { parseTorqueSalesInventorySpec } from "@/lib/torque-sales-inventory-spec";
import { buildSaveTheSaleResult } from "@/lib/save-the-sale";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Save the Sale | Torque Watchtower",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SaveTheSalePage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/watchtower/save-the-sale");
  const params = await searchParams;
  const request = typeof params.request === "string" ? params.request.trim().slice(0, 1200) : "";
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });
  let result: ReturnType<typeof buildSaveTheSaleResult> | null = null;
  let fetchedAt: string | undefined;
  let source: string | undefined;
  let reason: string | undefined;
  if (request.length >= 4) {
    if (runtime.effectiveMode !== "live-enabled") {
      reason = "Verified Orr inventory is not enabled in this Preview runtime. No demo cars were substituted.";
    } else {
      try {
        const catalog = await loadOrrResilientCustomerCatalog({
          mode: process.env.NORAUTO_INVENTORY_MODE,
          liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
        });
        if (!catalog.customerVisibleLiveInventory || catalog.source === "demo") {
          throw new Error("LIVE_SOURCE_UNVERIFIED");
        }
        result = buildSaveTheSaleResult({
          requirements: parseTorqueSalesInventorySpec(request),
          vehicles: catalog.vehicles,
        });
        fetchedAt = catalog.sourceEvidence?.fetchedAt;
        source = catalog.source === "provider-cache" ? "verified provider cache" : "verified Orr public inventory";
      } catch (error) {
        console.error("SAVE_THE_SALE_SOURCE_UNAVAILABLE", error instanceof Error ? error.message : String(error));
        reason = "Orr inventory could not be verified. No stock or availability claims can be made.";
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#070b10] py-10 text-white">
      <div className="shell max-w-5xl">
        <Link className="text-sm font-bold text-amber-300" href="/manager/watchtower">← Torque Watchtower</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-widest text-red-400">Salesperson opportunity · Preview</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">SAVE THE SALE</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Start with cars you can sell at Orr Nissan West, but never override a customer's must-haves.
          Search all verified eligible local vehicles before presenting comparable choices. Listings still require a human stock and price check.
        </p>
        <form method="get" className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <label htmlFor="request" className="block text-sm font-bold">What does the customer need?</label>
          <textarea id="request" name="request" required minLength={4} maxLength={1200} rows={3}
            defaultValue={request} placeholder="Example: 2026 Pathfinder AWD under $45000, preferably SV"
            className="mt-3 w-full rounded-xl border border-white/20 bg-[#101922] p-4 text-white placeholder:text-slate-500" />
          <button type="submit" className="mt-3 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">
            Find local sales opportunities
          </button>
        </form>
        {reason && <section role="status" className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-5 text-sm text-amber-100">
          {reason} You can still create a manual Vehicle Hunt from <Link className="font-bold underline" href="/manager/watchtower">Watchtower</Link>.
        </section>}
        {result && <section className="mt-8">
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5">
            <h2 className="text-2xl font-black">{result.opportunity === "PRESENT_LOCAL_MATCH" ? "Local options worth presenting" : "No verified local fit — start a Hunt"}</h2>
            <p className="mt-2 text-sm text-slate-300">Catalog searched: {result.eligibleVehicleCount} eligible vehicles · {result.exactCount} exact · {result.strongCount} strong</p>
            <p className="mt-1 text-xs text-slate-400">Source: {source} · Checked: {fetchedAt ?? "time unavailable"}. Advertised prices exclude applicable taxes, fees and qualifications.</p>
            <p className="mt-3 text-sm text-amber-200">{result.nextStep}</p>
          </div>
          <div className="mt-5 grid gap-4">
            {result.localOptions.map((option) => <article key={option.vehicle.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-300">{option.fit} local fit · Not reserved</p>
                  <h3 className="mt-2 text-xl font-black">{option.vehicle.year} {option.vehicle.make} {option.vehicle.model} {option.vehicle.trim}</h3>
                  <p className="mt-2 text-xs text-slate-400">VIN {option.vehicle.id} · Stock {option.vehicle.stockNumber ?? "not supplied"}</p>
                </div>
                <p className="text-xl font-black text-amber-300">${option.vehicle.price.toLocaleString("en-US")}</p>
              </div>
              <p className="mt-3 text-sm text-slate-300">Why it fits: {option.verifiedReasons.join(" · ") || "No verified preference details supplied"}</p>
              {option.preferenceCompromises.length > 0 && <p className="mt-2 text-sm text-amber-200">Preferred-item differences: {option.preferenceCompromises.join(" · ")}</p>}
              <p className="mt-2 text-xs text-slate-500">Availability, equipment and final pricing must be confirmed by the dealership.</p>
            </article>)}
          </div>
          <Link href="/manager/watchtower" className="mt-6 inline-block rounded-full border border-white/20 px-6 py-3 text-sm font-bold">Create or review Vehicle Hunt →</Link>
        </section>}
      </div>
    </main>
  );
}
