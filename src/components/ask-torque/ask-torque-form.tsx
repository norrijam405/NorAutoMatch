"use client";

import { useRef, useState } from "react";
import { Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";

type SubmitState = "IDLE" | "SENDING" | "DONE" | "ERROR";

export function AskTorqueForm() {
  const conversationId = useRef<string>(crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SubmitState>("IDLE");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("SENDING");
    setMessage("Saving your question securely…");

    const form = new FormData(event.currentTarget);
    const preferredContact = String(form.get("preferredContact") ?? "");
    const payload = {
      conversationId: conversationId.current,
      messageId: crypto.randomUUID(),
      message: String(form.get("message") ?? ""),
      vehicleVin: String(form.get("vehicleVin") ?? "").trim() || null,
      customer: {
        name: String(form.get("name") ?? "").trim() || null,
        phone: String(form.get("phone") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        preferredContact: preferredContact || null,
        communicationConsent: form.get("consent") === "on",
      },
    };

    const response = await fetch("/api/ask-torque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setState("ERROR");
      setMessage(typeof body?.message === "string" ? body.message : "Your question could not be saved.");
      return;
    }

    setState("DONE");
    setMessage(
      body?.routingDecision === "CONTACTABLE"
        ? "Got it. Your question is in the NorAutoMatch conversation queue for Torque/rep review and response."
        : "Your question was saved, but we still need a usable contact route and consent before follow-up.",
    );
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-amber-300"><MessageCircle size={20} /></span>
        <div>
          <h2 className="text-xl font-black text-white">Ask Torque</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Tell us what you are looking for. Torque uses the existing NorAutoMatch evidence and desk workflow instead of making up changing price, availability, approval, or appointment claims.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Name</span>
          <input name="name" maxLength={160} className="field" />
        </label>
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Vehicle VIN (optional)</span>
          <input name="vehicleVin" maxLength={17} className="field uppercase" />
        </label>
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Email</span>
          <input name="email" type="email" maxLength={254} className="field" />
        </label>
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Phone</span>
          <input name="phone" type="tel" maxLength={32} className="field" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">How should we respond?</span>
        <select name="preferredContact" required className="field">
          <option value="">Choose email, text, or phone</option>
          <option value="EMAIL">Email</option>
          <option value="TEXT">Text</option>
          <option value="PHONE">Phone</option>
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">What can Torque help with?</span>
        <textarea name="message" required maxLength={1000} className="field min-h-32" placeholder="Example: I need an SUV under $35k and I have a trade. What should I look at?" />
      </label>

      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-400">
        <input name="consent" type="checkbox" required className="mt-1 size-4" />
        <span>I agree that NorAutoMatch/dealership staff may use the contact method I selected to respond to this request.</span>
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={state === "ERROR" ? "text-xs text-rose-300" : state === "DONE" ? "text-xs text-emerald-300" : "text-xs text-slate-500"}>
          {message || "Submitting this form does not reserve a vehicle, approve financing, or create an appointment."}
        </p>
        <button disabled={state === "SENDING"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-black text-black disabled:opacity-60">
          {state === "SENDING" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send to Torque
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-slate-600">
        <ShieldCheck size={14} className="text-emerald-400" />
        Customer message intake only. Outbound response execution remains separately governed.
      </div>
    </form>
  );
}
