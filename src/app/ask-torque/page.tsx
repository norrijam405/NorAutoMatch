import type { Metadata } from "next";
import { AskTorqueForm } from "@/components/ask-torque/ask-torque-form";

export const metadata: Metadata = {
  title: "Ask Torque",
  description: "Ask NorAutoMatch for help finding the right vehicle and preparing your next step.",
};

export default function AskTorquePage() {
  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-14 sm:py-18">
      <div className="shell max-w-4xl">
        <p className="eyebrow">NorAutoMatch customer help</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Ask Torque</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
          Tell Torque what you need, what you drive now, or which vehicle you are considering. The message enters the same evidence-aware NorAutoMatch conversation workflow used by the desk.
        </p>
        <AskTorqueForm />
      </div>
    </section>
  );
}
