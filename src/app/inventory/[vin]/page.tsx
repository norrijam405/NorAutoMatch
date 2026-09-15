import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Fuel, Gauge, Images, Palette, ShieldCheck } from "lucide-react";
import { loadOrrCachedCustomerCatalog } from "@/lib/orr-cached-customer-catalog";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { formatMoney } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: Promise<{ vin: string }> }) {
  const { vin: rawVin } = await params;
  const vin = decodeURIComponent(rawVin).trim().toUpperCase();
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") notFound();

  let catalog;
  try {
    catalog = await loadOrrCachedCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
  } catch {
    notFound();
  }

  if (catalog.source !== "provider-cache") notFound();
  const vehicle = catalog.vehicles.find((item) => (item.vin ?? item.id).toUpperCase() === vin);
  if (!vehicle) notFound();

  const photos = vehicle.photos?.length ? vehicle.photos : [vehicle.image];
  const priceRows = [
    vehicle.marketPrice !== undefined ? ["Market price", vehicle.marketPrice] as const : undefined,
    vehicle.msrp !== undefined ? ["MSRP", vehicle.msrp] as const : undefined,
    vehicle.discountAmount !== undefined ? ["Source discount", -Math.abs(vehicle.discountAmount)] as const : undefined,
    vehicle.docFee !== undefined ? ["Document fee", vehicle.docFee] as const : undefined,
  ].filter(Boolean) as Array<readonly [string, number]>;

  const specs = [
    ["Mileage", `${vehicle.mileage.toLocaleString()} mi`],
    ["Drivetrain", vehicle.drivetrain],
    ["Transmission", vehicle.transmission],
    ["Engine", vehicle.engine],
    ["Horsepower", vehicle.horsepower !== undefined ? `${vehicle.horsepower} hp` : undefined],
    ["Fuel", vehicle.fuelType],
    ["City MPG", vehicle.cityMpg !== undefined ? String(vehicle.cityMpg) : undefined],
    ["Highway MPG", vehicle.highwayMpg !== undefined ? String(vehicle.highwayMpg) : undefined],
    ["Doors", vehicle.doors !== undefined ? String(vehicle.doors) : undefined],
    ["Exterior", vehicle.exteriorColor],
    ["Interior", vehicle.interiorColor],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <main className="min-h-screen bg-[#070b10] py-8 sm:py-12">
      <div className="shell">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/inventory" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><ArrowLeft size={16} /> Inventory</Link>
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-emerald-300"><ShieldCheck size={14} /> Verified cached vehicle</div>
        </div>

        <section className="grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0d131b]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="aspect-[16/9] w-full object-cover" />
            </div>
            {photos.length > 1 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.slice(1, 9).map((photo, index) => <div key={`${photo}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d131b]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo} alt={`${vehicle.model} photo ${index + 2}`} className="aspect-[4/3] h-full w-full object-cover" loading="lazy" /></div>)}
            </div>}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-300">{vehicle.condition ?? "Inventory"} · {vehicle.type}</p>
            <h1 className="mt-3 text-4xl font-black leading-[.95] tracking-[-.045em] text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
            <p className="mt-2 text-lg font-bold text-slate-400">{vehicle.trim}</p>
            <p className="mt-6 text-4xl font-black text-amber-300">{formatMoney(vehicle.price)}</p>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Source-advertised vehicle price. Taxes, registration, eligibility-dependent incentives and final deal terms are not inferred.</p>

            {priceRows.length > 0 && <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-black/25 p-4">{priceRows.map(([label, amount]) => <div key={label} className="flex items-center justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><span className="font-black text-slate-200">{amount < 0 ? `-${formatMoney(Math.abs(amount))}` : formatMoney(amount)}</span></div>)}</div>}

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <span className="rounded-xl border border-white/10 p-3 text-slate-300"><Gauge size={14} className="mr-2 inline text-amber-300" />{vehicle.mileage.toLocaleString()} mi</span>
              <span className="rounded-xl border border-white/10 p-3 text-slate-300"><Fuel size={14} className="mr-2 inline text-amber-300" />{vehicle.fuelType ?? "Fuel not listed"}</span>
              <span className="rounded-xl border border-white/10 p-3 text-slate-300"><Palette size={14} className="mr-2 inline text-amber-300" />{vehicle.exteriorColor ?? vehicle.accent}</span>
              <span className="rounded-xl border border-white/10 p-3 text-slate-300"><Images size={14} className="mr-2 inline text-amber-300" />{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
            </div>

            <div className="mt-6 space-y-1 text-[11px] leading-5 text-slate-500">
              <p>VIN <span className="font-mono text-slate-300">{vehicle.vin ?? vehicle.id}</span></p>
              {vehicle.stockNumber && <p>Stock <span className="font-mono text-slate-300">{vehicle.stockNumber}</span></p>}
              {catalog.sourceEvidence?.fetchedAt && <p>Inventory snapshot checked {new Date(catalog.sourceEvidence.fetchedAt).toLocaleString()}</p>}
            </div>

            {vehicle.vehicleUrl && <a href={vehicle.vehicleUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-black">Dealer listing <ExternalLink size={16} /></a>}
          </div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[26px] border border-white/10 bg-white/[.025] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Source-backed specs</p>
            <div className="mt-4 divide-y divide-white/5">{specs.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-5 py-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-slate-200">{value}</span></div>)}</div>
          </article>

          <article className="rounded-[26px] border border-white/10 bg-white/[.025] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300">Source-provided equipment</p>
            {vehicle.features?.length ? <div className="mt-4 flex flex-wrap gap-2">{vehicle.features.map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-slate-300">{feature}</span>)}</div> : <p className="mt-4 text-sm leading-6 text-slate-500">The current provider snapshot did not supply verified equipment details for this VIN. NorAuto will not guess them.</p>}
          </article>
        </section>
      </div>
    </main>
  );
}
