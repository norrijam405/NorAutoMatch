import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Growth Handoff Playbook",
  robots: { index: false, follow: false },
};

const searchTerms = [
  "cars by monthly payment Oklahoma City",
  "car finder Oklahoma City",
  "personal car shopper OKC",
  "cars under $500 a month OKC",
  "find me an SUV Oklahoma City",
  "personal car buying help OKC",
  "car delivery Mustang OK",
  "car finder Piedmont OK",
];

const negatives = [
  "repair", "parts", "oil change", "jobs", "rental", "manual", "insurance", "wholesale", "auction", "free", "credit repair", "Orr Nissan", "Nissan dealer",
];

export default function PlaybookPage() {
  if (process.env.NORAUTO_INTERNAL_DOCS_ENABLED !== "true") notFound();

  return (
    <section className="py-16 sm:py-24">
      <div className="shell">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow">Internal handoff · do not index</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-.05em] text-white sm:text-7xl">NorAuto Match growth playbook</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">One offer: tell me the monthly, I match the car or source the right option through Orr Nissan West. Do not rewrite this into a generic used-car dealer campaign.</p>
          <Link href="/master-build-prompt" className="btn-primary mt-7">Open the master Website + CRM prompt <ArrowRight size={17} /></Link>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Block title="Search Ads: first 21 days"><ul><li>Run through the approved dealership advertising structure and identify Orr Nissan West conspicuously.</li><li>Use a 25–35 mile geo around northwest Oklahoma City; Presence setting only.</li><li>Use exact and phrase match only at launch.</li><li>Primary conversion: completed lead. Secondary: phone click and text click.</li><li>Route payment terms to /#matcher and sourcing terms to the no-match route.</li><li>Do not bid on competing dealer names during the first phase.</li></ul></Block>
            <Block title="SEO: first 60 days"><ul><li>Verify the domain in Search Console and submit /sitemap.xml.</li><li>Index the matcher, process, and eight service-area pages.</li><li>Build useful payment and vehicle-fit guides—not cloned city pages.</li><li>NorAuto Match is a salesperson brand at Orr Nissan West, not an independent dealership or brokerage.</li><li>Do not create a separate salesperson Google Business Profile. Build authority through the approved dealer presence, organic pages, social profiles, and real customer reviews.</li></ul></Block>
            <Block title="Starter query lane"><div className="flex flex-wrap gap-2">{searchTerms.map((term) => <span key={term} className="rounded-full border border-emerald-400/20 bg-emerald-400/[.06] px-3 py-2 text-xs text-emerald-200">{term}</span>)}</div></Block>
            <Block title="Negative / blocked lane"><div className="flex flex-wrap gap-2">{negatives.map((term) => <span key={term} className="rounded-full border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-xs text-rose-200">{term}</span>)}</div></Block>
            <Block title="Creative franchises"><ol><li><strong>Payment Match Monday:</strong> one budget, three realistic options, complete assumptions.</li><li><strong>Deal Decoder:</strong> explain selling price, TTL, trade equity, term, and APR without attacking a competitor.</li><li><strong>Video Before the Drive:</strong> a real walkaround of the exact unit.</li><li><strong>Truck Fit Friday:</strong> towing, payload, commute, and family fit—not macho wallpaper.</li><li><strong>The empty deck:</strong> “Nothing fit, so I opened the approved sourcing network.”</li></ol></Block>
            <Block title="Scoreboard"><ul><li>Lead routing success: 100%</li><li>Median speed-to-lead: under 10 minutes during posted hours</li><li>Qualified lead rate: 35%+</li><li>Appointment set rate from qualified leads: 45%+</li><li>Appointment show rate: 70%+</li><li>Review request rate: 100% of eligible delivered buyers</li><li>Vehicle-sourcing share of leads: 25%+</li></ul></Block>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-6"><p className="text-sm font-bold text-emerald-300">Approval received</p><p className="mt-2 leading-7 text-slate-300">Employer/GM approval has been reported as received. Preserve the written approval and keep inventory use, lead ownership, advertising accounts, dealership identification, marks, pricing, payment claims, and disclaimers inside its documented scope.</p></div>
        </div>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-3xl border border-white/10 bg-slate-900/55 p-6"><h2 className="text-xl font-black text-white">{title}</h2><div className="mt-4 space-y-2 text-sm leading-7 text-slate-400 [&_li]:mb-2 [&_strong]:text-slate-200">{children}</div></article>;
}
