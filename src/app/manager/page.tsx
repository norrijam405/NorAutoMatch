import type { Metadata } from "next";
import { ManagerConsole } from "@/components/manager/manager-console";

export const metadata: Metadata = {
  title: "Manager Workbench",
  description: "Restricted NorAuto Match manager review workbench.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ManagerPage() {
  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow">Restricted operator surface</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Manager workbench</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
            Review persisted customer requests without granting NorAuto Match deal-approval authority. A valid short-lived manager session is required before customer data can be read or any review receipt can be recorded.
          </p>
        </div>
        <ManagerConsole />
      </div>
    </section>
  );
}
