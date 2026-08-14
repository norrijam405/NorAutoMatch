import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, CarFront, MapPin, MessageSquareText, SearchCheck } from "lucide-react";
import { brand, cityDetails } from "@/lib/brand";

export function generateStaticParams() {
  return Object.keys(cityDetails).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = cityDetails[slug];
  if (!city) return {};
  return {
    title: `Personal Car Matching in ${city.name}, OK`,
    description: `Payment-first car matching and personal vehicle sourcing for ${city.name}, Oklahoma. Set the number, shortlist the fit, or let NorAuto Match search the metro.`,
    alternates: { canonical: `/areas/${slug}` },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = cityDetails[slug];
  if (!city) notFound();

  const localSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Personal car matching in ${city.name}`,
    provider: { "@type": "ProfessionalService", name: brand.name, telephone: brand.phoneRaw },
    areaServed: { "@type": "City", name: `${city.name}, Oklahoma` },
    serviceType: "Vehicle matching and sourcing",
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5 py-20 sm:py-28">
        <div className="absolute inset-0 grid-noise opacity-50" /><div className="absolute -right-32 -top-32 size-[460px] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="shell relative"><div className="max-w-4xl"><p className="eyebrow flex items-center gap-2"><MapPin size={14} /> {city.name}, Oklahoma</p><h1 className="mt-5 text-5xl font-black leading-[.95] tracking-[-.055em] text-white sm:text-7xl">Find the right car in {city.name}—starting with the payment.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{city.intro} {city.local}</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/#matcher" className="btn-primary">Build my match <ArrowRight size={17} /></Link><a href={brand.textHref} className="btn-secondary"><MessageSquareText size={17} /> Text {brand.phoneDisplay}</a></div></div></div>
      </section>

      <section className="py-16 sm:py-24"><div className="shell"><div className="grid gap-5 md:grid-cols-3"><Value icon={<Calculator />} title="Set the number" text="Choose a monthly target, down payment, and term before you fall for the wrong price tag." /><Value icon={<CarFront />} title="See what fits" text="Shortlist representative SUVs, sedans, and trucks that fit the estimated buying power." /><Value icon={<SearchCheck />} title="Make me hunt" text={`If the deck comes up empty, I source across the Oklahoma City metro and coordinate the next step for ${city.name}.`} /></div></div></section>

      <section className="pb-20 sm:pb-28"><div className="shell"><div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6 sm:p-10"><div className="grid gap-8 lg:grid-cols-[1fr_.75fr] lg:items-center"><div><p className="eyebrow">Built for {city.name} drivers</p><h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">The dealership tour is not a buying strategy.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-400">Start online with the budget and the job the vehicle has to do. When an option looks right, I verify availability and the real deal structure before you cross town. Final vehicle sales and financing are completed through the licensed selling dealership.</p></div><div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-6"><p className="text-sm font-bold text-amber-300">Direct line</p><a href={`tel:${brand.phoneRaw}`} className="mt-2 block text-3xl font-black text-white hover:text-amber-300">{brand.phoneDisplay}</a><p className="mt-3 text-sm leading-6 text-slate-400">Call or text the monthly target, preferred body style, and when you need the vehicle.</p></div></div></div></div></section>

      <section className="border-t border-white/5 py-12"><div className="shell"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-600">Also serving</p><div className="mt-4 flex flex-wrap gap-2">{Object.entries(cityDetails).filter(([key]) => key !== slug).map(([key, item]) => <Link key={key} href={`/areas/${key}`} className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-white/25 hover:text-white">{item.name}</Link>)}</div></div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localSchema) }} />
    </>
  );
}

function Value({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-3xl border border-white/10 bg-slate-900/50 p-6"><span className="grid size-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">{icon}</span><h2 className="mt-6 text-xl font-black text-white">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></article>;
}
