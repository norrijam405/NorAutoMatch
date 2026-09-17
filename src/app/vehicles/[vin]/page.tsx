import Link from "next/link";
import { ArrowLeft, Camera, Fuel, Gauge, ImageIcon, Palette, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/inventory";
import { mergeVehiclePhotoUrls } from "@/lib/lot-photo-merge";
import { loadActiveLotPhotoUrls } from "@/lib/lot-photo-public";
import { loadVerifiedOrrVehicleDetail } from "@/lib/orr-vehicle-detail";

export const dynamic = "force-dynamic";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export default async function VehicleDetailPage({ params }: { params: Promise<{ vin: string }> }) {
  const { vin: rawVin } = await params;
  const vin = rawVin.toUpperCase();
  if (!VIN_RE.test(vin)) notFound();

  let detail;
  try {
    detail = await loadVerifiedOrrVehicleDetail(vin);
  } catch (error) {
    console.error("NORAUTO_VEHICLE_DETAIL_LOAD_FAILED", error instanceof Error ? error.message : String(error));
    notFound();
  }

  const vehicle = detail.vehicle;
  if (!vehicle.year || !vehicle.make || !vehicle.model || !vehicle.trim || !vehicle.price) notFound();

  const lotPhotoResult = await loadActiveLotPhotoUrls(vin);
  const providerPhotos = vehicle.photos ?? [];
  const photos = mergeVehiclePhotoUrls(lotPhotoResult.urls, providerPhotos);
  const lotPhotoCount = lotPhotoResult.urls.length;
  const hasLotPhotos = lotPhotoCount > 0;
  const usingPlaceholder = photos.length === 1 && photos[0].startsWith("/images/");
  const specs = [
    { label: "Mileage", value: vehicle.mileage !== undefined ? `${vehicle.mileage.toLocaleString()} mi` : undefined, icon: Gauge },
    { label: "Drivetrain", value: vehicle.drivetrain, icon: Wrench },
    { label: "Exterior", value: vehicle.exteriorColor, icon: Palette },
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
        <div>
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#111923]">
            <div className="aspect-[16/10]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photos[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`} className="h-full w-full object-cover" /></div>
          </div>
          {hasLotPhotos ? <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-emerald-300"><Camera size={13} /> Staff-approved lot photo{lotPhotoCount === 1 ? "" : "s"} shown first</div> : null}
          {photos.length > 1 && <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{photos.slice(1, 7).map((photo, index) => <div key={`${photo}-${index}`} className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-[#111923]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo} alt={`${vehicle.model} view ${index + 2}`} className="h-full w-full object-cover" loading="lazy" /></div>)}</div>}
        </div>

        <section className="rounded-[30px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">{vehicle.condition ?? "Inventory vehicle"}</p>
          <h1 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.05em] text-white sm:text-6xl">{vehicle.year} {vehicle.make}<br />{vehicle.model}</h1>
          <p className="mt-3 text-lg font-bold text-slate-400">{vehicle.trim}</p>
          <div className="mt-7 border-y border-white/10 py-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-600">Advertised source price</p><p className="mt-1 text-4xl font-black text-amber-300">{formatMoney(vehicle.price)}</p>{vehicle.msrp && vehicle.msrp !== vehicle.price ? <p className="mt-2 text-xs text-slate-500">Source MSRP {formatMoney(vehicle.msrp)}</p> : null}<p className="mt-2 text-[10px] leading-5 text-slate-600">Price is source evidence, not a financing promise or out-the-door quote.</p></div>
          <div className="mt-6 space-y-1 font-mono text-xs text-slate-500"><p>VIN {vehicle.vin}</p>{vehicle.stockNumber && <p>STOCK {vehicle.stockNumber}</p>}</div>
          {vehicle.incentives && vehicle.incentives.length > 0 && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300">Source incentive evidence</p>{vehicle.incentives.map((item) => <p key={item} className="mt-2 text-xs leading-5 text-amber-100/75">{item}</p>)}</div>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/#matcher" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-4 text-center text-sm font-black text-white">Ask NorAuto about it</Link>
            <Link href="/inventory" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-4 text-center text-sm font-black text-slate-200">Compare inventory</Link>
          </div>
        </section>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {specs.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Icon size={16} className="text-amber-300" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-600">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></article>)}
        <article className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><ImageIcon size={16} className="text-amber-300" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.16em] text-slate-600">Vehicle photos</p><p className="mt-1 text-sm font-bold text-white">{usingPlaceholder ? "Not supplied" : `${photos.length} image${photos.length === 1 ? "" : "s"}`}</p>{hasLotPhotos ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{lotPhotoCount} staff-approved lot photo{lotPhotoCount === 1 ? "" : "s"}; provider photos follow.</p> : <p className="mt-1 text-[10px] leading-4 text-slate-500">Current provider photo evidence.</p>}</article>
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-[#0d131b] p-6 sm:p-8">
        <div className="flex items-start gap-3"><Sparkles size={20} className="mt-1 shrink-0 text-amber-300" /><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300">Source-provided equipment</p><h2 className="mt-2 text-3xl font-black text-white">What this VIN actually reports.</h2><p className="mt-2 text-sm leading-6 text-slate-500">NorAuto lists equipment only when it is present in the dealer/provider evidence. An absent feature is not silently assumed.</p></div></div>
        {vehicle.features && vehicle.features.length > 0 ? <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{vehicle.features.map((feature) => <div key={feature} className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-slate-300">{feature}</div>)}</div> : <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-slate-500">No equipment list was supplied in the current verified record.</p>}
      </section>

      <p className="mt-8 text-[10px] uppercase tracking-[.14em] text-white/25">Orr Nissan West public inventory source · checked {new Date(detail.fetchedAt).toLocaleString()} · snapshot contained {detail.rawHitCount} dealer records{hasLotPhotos ? ` · ${lotPhotoCount} approved lot photo${lotPhotoCount === 1 ? "" : "s"} layered ahead of provider media` : ""}</p>
    </div>
  </main>;
}
