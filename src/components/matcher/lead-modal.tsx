"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadPayload } from "@/lib/lead-schema";
import { formatMoney } from "@/lib/inventory";

interface LeadModalProps {
  open: boolean;
  trigger: "retail" | "trapdoor";
  onClose: () => void;
  monthlyTarget: number;
  downPayment: number;
  termMonths: number;
  shortlistedVehicleIds: string[];
  context?: string;
}

type LeadReceipt = {
  opportunityId?: string;
  handoffId?: string;
  persistence?: "COMMITTED" | "DEDUPLICATED" | string;
  delivery?: string;
  workflowState?: string;
};

export function LeadModal(props: LeadModalProps) {
  if (!props.open) return null;
  return <LeadModalContent {...props} />;
}

function LeadModalContent({
  trigger,
  onClose,
  monthlyTarget,
  downPayment,
  termMonths,
  shortlistedVehicleIds,
  context,
}: LeadModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [receipt, setReceipt] = useState<LeadReceipt | null>(null);
  const [serverError, setServerError] = useState("");
  const pipeline = trigger === "trapdoor" ? "Vehicle Sourcing" : "Standard Retail";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadPayload>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      budgetRange: `${formatMoney(Math.max(monthlyTarget - 100, 0))}–${formatMoney(monthlyTarget + 100)}/month`,
      paymentMethod: "Financing",
      tradeIn: "",
      notes: context || "",
      source: "NorAuto Match website",
      trigger,
      pipeline,
      shortlistedVehicleIds,
      monthlyTarget,
      downPayment,
      termMonths,
      consent: undefined,
    },
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function onSubmit(values: LeadPayload) {
    setServerError("");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setServerError(data?.message || "I couldn’t send that yet. Call or text (405) 861-0061 instead.");
      return;
    }

    setReceipt({
      opportunityId: data?.opportunityId,
      handoffId: data?.handoffId,
      persistence: data?.persistence,
      delivery: data?.delivery,
      workflowState: data?.workflowState,
    });
    setSubmitted(true);
  }

  const customerReference = receipt?.opportunityId || receipt?.handoffId;
  const requestWasRecovered = receipt?.persistence === "DEDUPLICATED";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/80 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c1722] shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-[#0c1722]/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="pr-6">
            <p className="eyebrow">{pipeline} pipeline</p>
            <h2 id="lead-modal-title" className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {trigger === "trapdoor" ? "Activate Your Personal Garage Concierge" : "Put this match in motion"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">One form. One direct conversation. No BDC carousel.</p>
          </div>
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" aria-label="Close form"><X size={20} /></button>
        </div>

        {submitted ? (
          <div className="px-6 py-14 text-center sm:px-10 sm:py-16">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={34} /></span>
            <h3 className="mt-6 text-3xl font-black text-white">{requestWasRecovered ? "Your request is already in the lane." : "Your request is saved."}</h3>
            <p className="mx-auto mt-3 max-w-md leading-7 text-slate-400">{requestWasRecovered ? "I found the existing request instead of creating a duplicate." : "NorAuto Match recorded your request successfully."} The next step is a direct call or text from <strong className="text-slate-200">405-861-0061</strong>.</p>

            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Pipeline</span>
                <span className="text-sm font-black text-white">{pipeline}</span>
              </div>
              {customerReference && (
                <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3">
                  <span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Request ref</span>
                  <code className="max-w-[68%] break-all text-right text-xs font-bold text-amber-200">{customerReference}</code>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 pt-3">
                <span className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Current status</span>
                <span className="text-right text-xs font-bold text-emerald-200">Saved · awaiting human follow-up</span>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-slate-500">This confirmation means your request was saved. It does not mean a vehicle is reserved, financing is approved, or a dealership transaction is complete.</p>
            <button onClick={onClose} className="btn-primary mt-8">Back to the matcher</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7 sm:py-7">
            <Field label="First name" error={errors.firstName?.message}><input className="field" autoComplete="given-name" placeholder="First name" {...register("firstName")} /></Field>
            <Field label="Last name" error={errors.lastName?.message}><input className="field" autoComplete="family-name" placeholder="Last name" {...register("lastName")} /></Field>
            <Field label="Email" error={errors.email?.message}><input type="email" className="field" autoComplete="email" placeholder="you@example.com" {...register("email")} /></Field>
            <Field label="Phone" error={errors.phone?.message}><input type="tel" className="field" autoComplete="tel" placeholder="(405) 555-0123" {...register("phone")} /></Field>
            <Field label="Budget range" error={errors.budgetRange?.message}><input className="field" placeholder="$500–$700/month" {...register("budgetRange")} /></Field>
            <Field label="Payment method" error={errors.paymentMethod?.message}>
              <select className="field" {...register("paymentMethod")}><option>Financing</option><option>Cash</option><option>Lease</option></select>
            </Field>
            <Field label="Trade-in details" error={errors.tradeIn?.message} wide><textarea className="field min-h-24 resize-y py-3" placeholder="Year, make, model, miles, and payoff if known" {...register("tradeIn")} /></Field>
            <Field label="Anything I should know?" error={errors.notes?.message} wide><textarea className="field min-h-24 resize-y py-3" placeholder="Must-have features, timing, color, model, or delivery needs" {...register("notes")} /></Field>

            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs leading-5 text-slate-400">
                <input type="checkbox" className="mt-1 size-4 accent-amber-400" {...register("consent")} />
                <span>I agree to be contacted by NorAuto Match by call, email, or text about my vehicle request. Consent is not a condition of purchase. Message/data rates may apply. Reply STOP to opt out.</span>
              </label>
              {errors.consent && <p className="mt-1.5 text-xs text-rose-300">Please confirm contact consent.</p>}
            </div>

            <input type="hidden" {...register("source")} />
            <input type="hidden" {...register("trigger")} />
            <input type="hidden" {...register("pipeline")} />
            {serverError && <p className="sm:col-span-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{serverError}</p>}
            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="text-emerald-400" /> Your details are used only for this request.</p>
              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : null}
                {isSubmitting ? "Routing request…" : trigger === "trapdoor" ? "Activate concierge" : "Send my match"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children, wide = false }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-slate-400">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}
