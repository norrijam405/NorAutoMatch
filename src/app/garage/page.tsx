import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/supabase/authz";
import { buildMatchDnaSummary } from "@/lib/match-dna";
import type { Json } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "My Garage",
  robots: { index: false, follow: false, nocache: true },
};

export default async function GaragePage() {
  const { supabase, userId } = await requireAuthenticatedUser("/garage");
  const { data: saved } = await supabase
    .from("saved_vehicles")
    .select("vin,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const vins = saved?.map((row) => row.vin) ?? [];
  const [{ data: vehicles }, { data: dnaEvents }, { data: scoutJobs }, { data: dossiers }] = await Promise.all([
    vins.length
      ? supabase.from("inventory_vehicles").select("vin,year,make,model,trim,price,mileage,photos,availability_state,body_type,drivetrain").in("vin", vins)
      : Promise.resolve({ data: [] }),
    supabase
      .from("match_dna_events")
      .select("action,make,body_type,drivetrain,condition,price,mileage")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(250),
    vins.length
      ? supabase.from("market_scout_jobs").select("vin,status,requested_at").eq("user_id", userId).in("vin", vins)
      : Promise.resolve({ data: [] }),
    vins.length
      ? supabase.from("vehicle_scout_dossiers").select("vin,status,summary,pros,cons,watch_items,sources,researched_at").in("vin", vins)
      : Promise.resolve({ data: [] }),
  ]);

  const byVin = new Map((vehicles ?? []).map((vehicle) => [vehicle.vin, vehicle]));
  const jobsByVin = new Map((scoutJobs ?? []).map((job) => [job.vin, job]));
  const dossiersByVin = new Map((dossiers ?? []).map((dossier) => [dossier.vin, dossier]));
  const dna = buildMatchDnaSummary(dnaEvents ?? []);

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-12 sm:py-16">
      <div className="shell">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Protected garage</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white">Saved vehicles</h1>
            <p className="mt-4 max-w-2xl text-slate-400">A Keep is now a real Garage save. Market Scout research and Match DNA intelligence attach to the VIN without turning this page into another dashboard.</p>
          </div>
          <details className="group max-w-sm rounded-2xl border border-red-500/20 bg-red-500/[.04] px-4 py-3">
            <summary className="cursor-pointer list-none text-xs font-black text-red-300">
              Match DNA · {dna.signalCount} signal{dna.signalCount === 1 ? "" : "s"}
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-400">{dna.label}</p>
            {(dna.priceCenter || dna.mileageCenter) && <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {dna.priceCenter ? `Kept-price center ≈ $${Math.round(dna.priceCenter).toLocaleString()}` : ""}
              {dna.priceCenter && dna.mileageCenter ? " · " : ""}
              {dna.mileageCenter ? `mileage center ≈ ${Math.round(dna.mileageCenter).toLocaleString()} mi` : ""}
            </p>}
            <p className="mt-2 text-[10px] leading-4 text-slate-600">DNA is behavioral guidance, not a claim that you must buy a certain vehicle. It changes as your choices change.</p>
          </details>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {saved?.length ? saved.map((item) => {
            const vehicle = byVin.get(item.vin);
            const job = jobsByVin.get(item.vin);
            const dossier = dossiersByVin.get(item.vin);
            const pros = jsonStrings(dossier?.pros);
            const cons = jsonStrings(dossier?.cons);
            const watch = jsonStrings(dossier?.watch_items);
            return (
              <article key={item.vin} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300">Saved VIN</p>
                    <h2 className="mt-2 text-xl font-black text-white">{vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "Saved vehicle"}</h2>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">{vehicle?.body_type ?? "Vehicle"}</span>
                </div>
                {vehicle?.price != null ? <p className="mt-3 font-bold text-amber-300">${Number(vehicle.price).toLocaleString()}</p> : null}
                <p className="mt-1 text-sm text-slate-400">{vehicle?.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} miles` : "Mileage unavailable"}{vehicle?.drivetrain ? ` · ${vehicle.drivetrain}` : ""}</p>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-300">Market Scout</p>
                    <span className="text-[10px] font-bold text-slate-500">{dossier?.status === "researched" ? "Research ready" : job?.status === "failed" ? "Needs retry" : "Queued"}</span>
                  </div>
                  {dossier?.status === "researched" ? <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-bold text-white">Pros, cons & watch-outs</summary>
                    {dossier.summary && <p className="mt-3 text-xs leading-5 text-slate-400">{dossier.summary}</p>}
                    {pros.length > 0 && <ScoutList title="Pros" items={pros} />}
                    {cons.length > 0 && <ScoutList title="Cons" items={cons} />}
                    {watch.length > 0 && <ScoutList title="Watch" items={watch} />}
                    <p className="mt-3 text-[10px] leading-4 text-slate-600">Scout claims stay evidence-linked and refreshable; missing evidence stays missing.</p>
                  </details> : <p className="mt-2 text-xs leading-5 text-slate-500">This VIN is in the research queue. Deep pros/cons will appear here when the Market Scout worker completes its evidence pass.</p>}
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                  <Link href={`/vehicles/${encodeURIComponent(item.vin)}`} className="text-amber-300 hover:text-amber-200">Full details →</Link>
                  <Link href="/inventory" className="text-slate-400 hover:text-white">Compare inventory</Link>
                </div>
                <p className="mt-4 text-[9px] text-slate-700">VIN {item.vin}</p>
              </article>
            );
          }) : <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><p className="font-bold text-white">No saved vehicles yet.</p><p className="mt-2 text-sm leading-6 text-slate-500">Tap Keep in SwipeMatch or Garage on an inventory card. Once signed in, the VIN should land here and start its Scout/DNA workflow.</p><Link href="/inventory" className="mt-4 inline-block text-sm font-black text-amber-300">Browse inventory →</Link></div>}
        </div>
      </div>
    </section>
  );
}

function jsonStrings(value: Json | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
}

function ScoutList({ title, items }: { title: string; items: string[] }) {
  return <div className="mt-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{title}</p>{items.map((item) => <p key={`${title}-${item}`} className="mt-1 text-[11px] leading-5 text-slate-400">• {item}</p>)}</div>;
}
