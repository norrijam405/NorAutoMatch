import Link from "next/link";
import { MessageSquareText, Phone } from "lucide-react";
import { brand, cityDetails } from "@/lib/brand";
import { Logo } from "./header";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <div className="shell grid gap-10 py-14 md:grid-cols-[1.2fr_.8fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">An independent, salesperson-operated payment-first shopping experience. One person, one number, no lead-queue runaround.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`tel:${brand.phoneRaw}`} className="btn-primary min-h-10 px-4 py-2"><Phone size={16} /> {brand.phoneDisplay}</a>
            <a href={brand.textHref} className="btn-secondary min-h-10 px-4 py-2"><MessageSquareText size={16} /> Send a text</a>
          </div>
        </div>
        <div>
          <p className="eyebrow">Explore</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <Link href="/#matcher" className="hover:text-white">Interactive matcher</Link>
            <Link href="/how-it-works" className="hover:text-white">How it works</Link>
            <Link href="/privacy" className="hover:text-white">Privacy & consent</Link>
            <Link href="/terms" className="hover:text-white">Disclosures & terms</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow">OKC metro</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-sm text-slate-300">
            {Object.entries(cityDetails).map(([slug, city]) => <Link key={slug} href={`/areas/${slug}`} className="hover:text-white">{city.name}</Link>)}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-white/[.02]">
        <div className="shell flex flex-col gap-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-black text-white">Independent shopping experience operated by a salesperson affiliated with {brand.dealer.name}</p><p className="mt-1 text-xs text-slate-500">NorAuto Match is not presented as the dealership&apos;s official website. Final transactions are completed by a licensed selling dealership.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2"><a href={`tel:${brand.dealer.phoneRaw}`} className="font-bold text-slate-300 hover:text-white">Dealership: {brand.dealer.phoneDisplay}</a><a href={brand.dealer.url} target="_blank" rel="noreferrer" className="font-bold text-amber-300 hover:text-amber-200">Official dealership website ↗</a></div>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="shell flex flex-col gap-3 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-start sm:justify-between">
          <p>© {new Date().getFullYear()} NorAuto Match. Independent salesperson-operated shopping interface.</p>
          <p className="max-w-3xl sm:text-right">Vehicle availability and pricing are subject to change. Payment examples are estimates only, exclude taxes, title, license, fees, optional products, and other disclosed charges, and are not an offer of credit. All vehicle sales, financing, paperwork, and delivery are completed by Orr Nissan West or another approved licensed selling dealership.</p>
        </div>
      </div>
    </footer>
  );
}
