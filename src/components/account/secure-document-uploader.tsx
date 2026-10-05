"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Upload } from "lucide-react";

const kinds = [
  ["TRADE_OFFER", "Trade offer"],
  ["DRIVER_LICENSE", "Driver's license"],
  ["INSURANCE", "Insurance"],
  ["PAYOFF_STATEMENT", "Payoff statement"],
  ["PROOF_OF_RESIDENCE", "Proof of residence"],
  ["DEAL_STIPULATION", "Deal stipulation"],
  ["OTHER", "Other deal document"],
] as const;

export function SecureDocumentUploader() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"IDLE" | "UPLOADING" | "DONE" | "ERROR">("IDLE");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("UPLOADING");
    setMessage("Encrypting the trip to private storage…");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/documents", { method: "POST", body: form });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setState("ERROR");
      setMessage(body?.message || "The secure upload did not complete.");
      return;
    }

    setState("DONE");
    setMessage("Document received. Torque can see only the status, not the raw file.");
    formRef.current?.reset();
    window.location.reload();
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={20} /></span>
        <div>
          <h2 className="text-xl font-black text-white">Upload securely</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">PDF, JPG, PNG, or WebP. Maximum 12 MB. Files are private and are not inserted into the normal chat transcript.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Document type</span>
          <select name="kind" required className="field">
            {kinds.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">File</span>
          <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="field file:mr-3 file:rounded-full file:border-0 file:bg-amber-300 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-black" />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={state === "ERROR" ? "text-xs text-rose-300" : state === "DONE" ? "text-xs text-emerald-300" : "text-xs text-slate-500"}>{message || "No lender submission or credit decision occurs here."}</p>
        <button disabled={state === "UPLOADING"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-black text-black disabled:opacity-60">
          {state === "UPLOADING" ? <Loader2 size={16} className="animate-spin" /> : state === "DONE" ? <CheckCircle2 size={16} /> : <Upload size={16} />}
          Upload document
        </button>
      </div>
    </form>
  );
}
