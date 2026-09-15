import Link from "next/link";
import { ArrowLeft, Fuel, Gauge, Palette, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/inventory";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

export const dynamic = "force-dynamic";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export default async function VehicleDetailPage({ params }: { params: Promise<{ vin: string }> }) {
  const { vin: rawVin } = await params;
  const vin = rawVin.toUpperCase();
  if (!VIN_RE.test(vin)) notFound();

  const catalog = await loadOrrResilientCustomerCatalog({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });
  const vehicle = catalog.vehicles.find((candidate) => candidate.id.toUpperCase() === vin);
  if (!vehicle) notFound();

  const specs = [
    { label: "Mileage", value: `${vehicle.mileage.toLocaleString()} mi`, icon: Gauge },
    { label: "Drivetrain", value: vehicle.drivetrain, icon: Wrench },
    { label: "Exterior", value: vehicle.exteriorColor ?? vehicle.accent, icon: Palette },
    { label: "Interior", value: vehicle.interiorColor, icon: Palette },
    { label: "Engine", value: vehicle.engine, icon: Wrench },
    { label: "Transmission", value: vehicle.transmission, icon: Wrench },
    { label: "Fuel", value: vehicle.fuelType, icon: Fuel },
    { label: "Fuel economy", value: vehicle.cityMpg || vehicle.highwayMpg ? `${vehicle.cityMpg ?? "—"} city / ${vehicle.highwayMpg ?? "—"} hwy` : undefined, icon: Fuel },
  ].filter((item) => item.value);

  return <main className="min-h-screen bg-[#070b10] py-8 sm:py-12">
    <div className="shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/vehicles" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><ArrowLeft size={16} /> All verified vehicles</Link>
        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-emerald-300"><ShieldCheck size={14} /> Source-verified VIN</span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-start">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#111923]">
          <div className="aspect-[16/10]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={vehicle.image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`} className="h-full w-full object-cover" /></div>
        </div>

        <section className="rounded-[30px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">{vehicle.condition ?? "Inventory vehicle"}</p>
          <h1 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.05em] text-white sm:text-6xl">{vehicle.year} {vehicle.make}<br />{vehicle.model}</h1>
          <p className="mt-3 text-lg font-bold text-slate-400">{vehicle.trim}</p>
          <div className="mt-7 border-y border-white/10 py-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-600">Advertised source price</p><p className="mt-1 text-4xl font-black text-amber-300">{formatMoney(vehicle.price)}</p><p className="mt-2 text-[10px] leading-5 text-slate-600">Price is source evidence, not a financing promise or out-the-door quote.</p></div>
          <p className="mt-6 font-mono text-xs text-slate-500">VIN {vehicle.id}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href={`/#matcher`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-black text-white">Ask NorAuto about it</Link>
            <Link href="/inventory" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-black text-slate-200">Compare inventory</Link>
          </div>
        </section>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {specs.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon size={16} className="text-amber-300" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-600">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></article>)}
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-[#0d131b] p-6 sm:p-8">
        <div className="flex items-start gap-3"><Sparkles size={20} className="mt-1 shrink-0 text-amber-300" /><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300">Source-provided equipment</p><h2 className="mt-2 text-3xl font-black text-white">What this VIN actually reports.</h2><p className="mt-2 text-sm leading-6 text-slate-500">NorAuto lists equipment only when it is present in the dealer/provider evidence. An absent feature is not silently assumed.</p></div></div>
        {vehicle.features && vehicle.features.length > 0 ? <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{vehicle.features.map((feature) => <div key={feature} className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-slate-300">{feature}</div>)}</div> : <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-slate-500">No equipment list was supplied in the current verified record.</p>}
      </section>

      <p className="mt-8 text-[10px] uppercase tracking-[.14em] text-white/25">Catalog source: {catalog.source}{catalog.sourceEvidence?.fetchedAt ? ` · checked ${new Date(catalog.sourceEvidence.fetchedAt).toLocaleString()}` : ""}</p>
    </div>
  </main>;
}
