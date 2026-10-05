import Link from "next/link";

type SavedComparisonVehicle = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  price: number | null;
  mileage: number | null;
  availability_state: string | null;
  body_type: string | null;
  drivetrain: string | null;
};

export function SavedVehicleComparison({ vehicles }: { vehicles: SavedComparisonVehicle[] }) {
  const comparable = vehicles.filter(Boolean).slice(0, 3);
  if (comparable.length < 2) return null;

  const priced = comparable.filter((vehicle) => vehicle.price != null);
  const mileaged = comparable.filter((vehicle) => vehicle.mileage != null);
  const lowestPrice = priced.length ? Math.min(...priced.map((vehicle) => Number(vehicle.price))) : null;
  const lowestMileage = mileaged.length ? Math.min(...mileaged.map((vehicle) => Number(vehicle.mileage))) : null;

  return (
    <section className="mt-8 rounded-3xl border border-amber-400/20 bg-amber-400/[.035] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">Garage comparison</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-.03em] text-white">Your saved cars, side by side</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Compare up to three recently saved vehicles using the live fields already attached to their VINs. Missing source data stays missing.</p>
        </div>
        <Link href="/inventory" className="text-sm font-black text-amber-300 hover:text-amber-200">Find another match →</Link>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[720px] gap-3" style={{ gridTemplateColumns: `repeat(${comparable.length}, minmax(0, 1fr))` }}>
          {comparable.map((vehicle) => {
            const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
            const priceDelta = lowestPrice != null && vehicle.price != null ? Number(vehicle.price) - lowestPrice : null;
            const mileageDelta = lowestMileage != null && vehicle.mileage != null ? Number(vehicle.mileage) - lowestMileage : null;
            return (
              <article key={vehicle.vin} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{vehicle.body_type ?? "Vehicle"}</p>
                <h3 className="mt-2 min-h-12 text-lg font-black text-white">{title || "Saved vehicle"}</h3>

                <dl className="mt-4 space-y-3 text-sm">
                  <Metric label="Price" value={vehicle.price != null ? `$${Number(vehicle.price).toLocaleString()}` : "Unavailable"} note={priceDelta != null ? priceDelta === 0 ? "Lowest saved price" : `+$${priceDelta.toLocaleString()} vs lowest` : undefined} />
                  <Metric label="Mileage" value={vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} mi` : "Unavailable"} note={mileageDelta != null ? mileageDelta === 0 ? "Lowest saved mileage" : `+${mileageDelta.toLocaleString()} mi vs lowest` : undefined} />
                  <Metric label="Drivetrain" value={vehicle.drivetrain ?? "Unavailable"} />
                  <Metric label="Availability" value={vehicle.availability_state ?? "Unknown"} />
                </dl>

                <Link href={`/vehicles/${encodeURIComponent(vehicle.vin)}`} className="mt-5 inline-block text-sm font-black text-amber-300 hover:text-amber-200">Open VIN details →</Link>
              </article>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-4 text-slate-600">Comparison labels describe the saved set only; they are not purchase recommendations, appraisals, quotes, or guarantees of current availability.</p>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[.025] p-3">
      <dt className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">{label}</dt>
      <dd className="mt-1 font-bold text-slate-200">{value}</dd>
      {note ? <p className="mt-1 text-[10px] text-slate-500">{note}</p> : null}
    </div>
  );
}
