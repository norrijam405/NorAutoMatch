"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import type { Vehicle } from "@/lib/inventory";

type Props = {
  vehicle: Vehicle | null;
  onClose: () => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
};

const initialForm: FormState = { firstName: "", lastName: "", email: "", phone: "", consent: false };

export function FinanceInterestModal({ vehicle, onClose }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (!vehicle) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.consent) {
      setError("Please confirm contact consent before continuing.");
      return;
    }
    setStatus("submitting");
    setError("");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        budgetRange: "Not provided — finance interest only",
        paymentMethod: "Financing",
        tradeIn: "",
        notes: `Customer requested a secure financing next step for VIN ${vehicle.id}. No credit application, SSN, income, or credit-pull authorization was collected by this form.`,
        source: "NorAuto Match finance-interest gate",
        trigger: "retail",
        pipeline: "Standard Retail",
        shortlistedVehicleIds: [vehicle.id],
        consent: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message || "I couldn’t save that request yet. Please call or text instead.");
      setStatus("error");
      return;
    }

    setStatus("done");
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/80 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="finance-interest-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#0c1722] sm:max-w-xl sm:rounded-[28px]">
        <div className="sticky top-0 flex items-start justify-between border-b border-white/10 bg-[#0c1722]/95 p-5 backdrop-blur">
          <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">Secure finance next step</p><h2 id="finance-interest-title" className="mt-2 text-2xl font-black text-white">Start the conversation — not the credit pull.</h2></div>
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400" aria-label="Close"><X size={18} /></button>
        </div>

        {status === "done" ? <div className="p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={28} /></span><h3 className="mt-5 text-2xl font-black text-white">Finance-interest request saved.</h3><p className="mt-3 text-sm leading-6 text-slate-400">The next step is a secure human-guided application path. This form did not submit a credit application and did not authorize a credit inquiry.</p><button onClick={onClose} className="mt-6 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-black">Back to inventory</button></div> :
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <div className="sm:col-span-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.05] p-4"><p className="text-xs font-black text-emerald-200">{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</p><p className="mt-1 text-[11px] text-slate-500">VIN {vehicle.id}</p></div>
          <Field label="First name"><input required minLength={2} className="field" autoComplete="given-name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Field>
          <Field label="Last name"><input required minLength={2} className="field" autoComplete="family-name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></Field>
          <Field label="Email"><input required type="email" className="field" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Phone"><input required type="tel" minLength={10} className="field" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>

          <div className="sm:col-span-2 rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-4 text-xs leading-5 text-slate-400"><strong className="text-amber-200">No credit application is collected here.</strong> Do not enter an SSN, date of birth, income, bank information, or other sensitive financial information. If you choose to continue later, the actual secure application and any authorization to obtain a credit report must be presented separately before submission.</div>

          <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs leading-5 text-slate-400"><input type="checkbox" className="mt-1 size-4 accent-amber-300" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /><span>I agree to be contacted about financing options for this vehicle. I understand this is only a request for follow-up and is <strong className="text-slate-200">not</strong> a credit application, credit approval, or authorization to pull my credit.</span></label>
          {error && <p className="sm:col-span-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="text-emerald-400" /> Sensitive credit data stays out of this form.</p><button disabled={status === "submitting"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-black text-black disabled:opacity-60">{status === "submitting" && <Loader2 size={16} className="animate-spin" />}Request secure finance next step</button></div>
        </form>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>{children}</label>;
}
