import type { Metadata } from "next";
import Link from "next/link";
import { VehicleMediaSearch } from "@/components/manager/vehicle-media-search";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";
import { parseTorqueSalesInventorySpec } from "@/lib/torque-sales-inventory-spec";
import { buildSaveTheSaleResult } from "@/lib/save-the-sale";
import { interpretLifestyleSearch, lifestyleCandidates } from "@/lib/lifestyle-car-search";
import type { Vehicle } from "@/lib/inventory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Find My Car | NorAutoMatch",
  description: "Search for a car without making an account. Describe what you want or add a vehicle picture for local reference.",
};

export default async function FindMyCarPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const params = await searchParams;
  const request = typeof params.request === "string" ? params.request.trim().slice(0, 1200) : "";
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });
  let result: ReturnType<typeof buildSaveTheSaleResult> | null = null;
  let source: string | undefined;
  let fetchedAt: string | undefined;
  let reason: string | undefined;
  let lifestyleResults: Array<{ vehicle: Vehicle; compact: boolean; mpg: number | null; score: number }> | null = null;
  const lifestyleIntent = interpretLifestyleSearch(request);

  if (request.length >= 4) {
    if (runtime.effectiveMode !== "live-enabled") {
      reason = "Live Orr inventory is being verified. We cannot confirm matching vehicles yet.";
    } else {
      try {
        const catalog = await loadOrrResilientCustomerCatalog({
          mode: process.env.NORAUTO_INVENTORY_MODE,
          liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
        });
        if (!catalog.customerVisibleLiveInventory || catalog.source === "demo") throw new Error("NOT_VERIFIED");
        if (lifestyleIntent) {
          lifestyleResults = lifestyleCandidates(catalog.vehicles, lifestyleIntent);
        } else {
          result = buildSaveTheSaleResult({
            requirements: parseTorqueSalesInventorySpec(request),
            vehicles: catalog.vehicles,
          });
        }
        source = catalog.source === "provider-cache" ? "verified inventory cache" : "verified dealer feed";
        fetchedAt = catalog.sourceEvidence?.fetchedAt;
      } catch {
        reason = "Verified inventory is temporarily unavailable. We will not show fictional or unconfirmed listings.";
      }
    }
  }

  return <main className="min-h-screen bg-[#070b10] py-10 text-white"><div className="shell max-w-5xl">
    <Link href="/" className="text-sm font-bold text-amber-300">← NorAutoMatch Home</Link>
    <p className="mt-8 text-xs font-black uppercase tracking-widest text-emerald-300">No account required</p>
    <h1 className="mt-3 text-5xl font-black tracking-tight">FIND YOUR CAR</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
      Describe the car you want, then explore real inventory when our dealer feed is verified. Search freely without joining or signing in.
      Save a vehicle to your Garage only when you choose to keep it for later.
    </p>
    <VehicleMediaSearch initialRequest={request} publicShopping />
    {reason && <section role="status" className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-5 text-sm text-amber-100">
      {reason} <a href="https://orrnissanwest.com/inventory" target="_blank" rel="noopener noreferrer" className="font-bold underline">Browse Orr Nissan West inventory directly →</a> No account is required for our search.
    </section>}
    {lifestyleResults && <section className="mt-8">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
        <h2 className="text-2xl font-black">{lifestyleIntent?.thirdRow ? "Verified third-row SUVs to explore" : lifestyleIntent?.teen ? "Sedans worth exploring for a new driver" : "Vehicles to explore based on your priorities"}</h2>
        <p className="mt-2 text-sm text-slate-300">We use body style, dealer-listed prices, and available fuel economy evidence to narrow the request. A stated price ceiling is enforced. Fuel-efficient means a preference unless you provide a specific MPG target; missing MPG is never invented.</p>
        <p className="mt-3 text-xs text-amber-200">Before choosing for a teen, confirm the specific VIN's crash-test ratings, driver-assistance equipment, insurance cost, condition and recalls. NorAutoMatch does not independently verify those safety facts.</p>
        <p className="mt-2 text-xs text-slate-400">{lifestyleIntent && lifestyleIntent.maxPrice !== null && <span>Budget ceiling: ${lifestyleIntent.maxPrice.toLocaleString("en-US")} · </span>}Source: {source} · Checked: {fetchedAt ?? "time unavailable"}. Prices and availability must be confirmed with the dealer.</p>
        {!lifestyleResults.length && <p className="mt-3 text-sm text-amber-200">No vehicles with verified evidence for those requirements were found in this catalog. Try browsing all inventory or ask the dealership to confirm equipment.</p>}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {lifestyleResults.map(({ vehicle, compact, mpg }) => <article key={vehicle.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <p className="text-xs font-black uppercase text-emerald-300">{lifestyleIntent?.thirdRow ? "Third-row documented" : compact ? "Compact sedan candidate" : "Vehicle to explore"}</p>
          <h3 className="mt-2 text-xl font-black">{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</h3>
          <p className="mt-2 text-lg font-black text-amber-300">${vehicle.price.toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-slate-400">VIN {vehicle.id}{mpg !== null ? ` · Approx. ${mpg} combined MPG from source city/highway figures` : " · MPG not verified"}</p>
          <Link href={`/vehicles/${vehicle.id}`} className="mt-4 inline-flex rounded-full bg-amber-300 px-5 py-2.5 text-sm font-black text-black">Check photos and vehicle details →</Link>
        </article>)}
      </div>
    </section>}
    {result && <section className="mt-8">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
        <h2 className="text-2xl font-black">{result.localOptions.length ? "Matching local vehicles" : "No confirmed local match yet"}</h2>
        <p className="mt-2 text-sm text-slate-300">{result.eligibleVehicleCount} vehicles checked · {result.exactCount} exact matches · {result.strongCount} close matches</p>
        <p className="mt-2 text-xs text-slate-400">Source: {source} · Checked: {fetchedAt ?? "time unavailable"}. Availability and final price require dealer confirmation.</p>
        {!result.localOptions.length && <p className="mt-3 text-sm text-amber-200">We don't have a verified match for that request. Try changing a preference or contact the dealership for a wider search.</p>}
      </div>
      <div className="mt-5 grid gap-4">
        {result.localOptions.map(({vehicle,fit,verifiedReasons,preferenceCompromises}) => <article key={vehicle.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-black uppercase text-emerald-300">{fit === "EXACT" ? "Meets stated requirements" : "Close fit"}</p>
              <h3 className="mt-2 text-xl font-black">{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</h3>
              <p className="mt-1 text-xs text-slate-400">VIN {vehicle.id} · Stock {vehicle.stockNumber ?? "not supplied"}</p>
            </div>
            <p className="text-xl font-black text-amber-300">${vehicle.price.toLocaleString("en-US")}</p>
          </div>
          <p className="mt-3 text-sm text-slate-300">{verifiedReasons.join(" · ") || "Details require confirmation"}</p>
          {preferenceCompromises.length > 0 && <p className="mt-2 text-sm text-amber-200">Differences: {preferenceCompromises.join(" · ")}</p>}
          <Link href={`/vehicles/${vehicle.id}`} className="mt-4 inline-flex rounded-full bg-amber-300 px-5 py-2.5 text-sm font-black text-black">View vehicle photos and details →</Link>
          <p className="mt-3 text-xs text-slate-500">A Garage save does not reserve or hold the vehicle. Cars can sell before confirmation.</p>
        </article>)}
      </div>
      <Link href="/inventory" className="mt-6 inline-block rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">Browse and save vehicles when ready →</Link>
    </section>}
    <p className="mt-8 text-xs leading-5 text-slate-500">Photo/video selections are previewed on your device only. Automated image identification is coming later and is not active in this version.</p>
  </div></main>;
}
