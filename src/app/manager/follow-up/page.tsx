import type { Metadata } from "next";
import Link from "next/link";
import { FollowUpDesk } from "@/components/manager/follow-up-desk";

export const metadata: Metadata = {
  title: "Manager Follow-up Desk",
  description: "Restricted NorAuto Match manager follow-up workbench.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ManagerFollowUpPage() {
  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow">Restricted operator surface</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Follow-up desk</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Work the response queue without confusing an attempted call with confirmed contact. Every state-changing action requires an evidence reference and a valid short-lived manager session.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold"><Link href="/manager" className="text-amber-300 hover:text-amber-200">← Manager review</Link><Link href="/manager/appointments" className="text-amber-300 hover:text-amber-200">Appointment desk →</Link></div>
        </div>
        <FollowUpDesk />
      </div>
    </section>
  );
}
