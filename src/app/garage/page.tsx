import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/supabase/authz";

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
  const { data: vehicles } = vins.length
    ? await supabase
        .from("inventory_vehicles")
        .select("vin,year,make,model,trim,price,mileage,photos,availability_state")
        .in("vin", vins)
    : { data: [] };

  const byVin = new Map((vehicles ?? []).map((vehicle) => [vehicle.vin, vehicle]));

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell">
        <p className="eyebrow">Protected garage</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white">Saved vehicles</h1>
        <p className="mt-4 max-w-2xl text-slate-400">Only vehicles saved by your authenticated account appear here. Inventory details remain source-backed and freshness-qualified.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {saved?.length ? saved.map((item) => {
            const vehicle = byVin.get(item.vin);
            return (
              <article key={item.vin} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">VIN {item.vin}</p>
                <h2 className="mt-3 text-xl font-black text-white">{vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "Saved vehicle"}</h2>
                {vehicle?.price != null ? <p className="mt-2 font-bold text-amber-300">${Number(vehicle.price).toLocaleString()}</p> : null}
                {vehicle?.mileage != null ? <p className="mt-1 text-sm text-slate-400">{Number(vehicle.mileage).toLocaleString()} miles</p> : null}
                <Link href={`/inventory?vin=${encodeURIComponent(item.vin)}`} className="mt-5 inline-block text-sm font-bold text-amber-300 hover:text-amber-200">View inventory record →</Link>
              </article>
            );
          }) : <p className="text-slate-400">No saved vehicles yet.</p>}
        </div>
      </div>
    </section>
  );
}
