"use client";

import { useState } from "react";
import { CalendarCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

type Item = {
  protocol: "NORAUTO_APPOINTMENT_QUEUE_ITEM_V1";
  truthState: "READ_MODEL_ONLY";
  authorityEffect: "NONE";
  opportunityId: string;
  pipeline: string;
  stage: "CONTACTED";
  customer: { firstName: string; lastName: string; email: string; phone: string };
  attribution: { source: string };
  updatedAt: string;
};

export function AppointmentDesk() {
  const [draftToken, setDraftToken] = useState("");
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Manager credentials remain only in this browser tab's memory.");
  const [busy, setBusy] = useState<string>();

  async function load(session = token) {
    try {
      const response = await fetch("/api/manager/progression/queue?limit=100", { headers: { Authorization: `Bearer ${session}` }, cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.protocol !== "NORAUTO_APPOINTMENT_QUEUE_RESPONSE_V1" || body?.truthState !== "READ_MODEL_ONLY" || body?.authorityEffect !== "NONE" || !Array.isArray(body?.items)) {
        setItems([]);
        setMessage(response.status === 401 ? "Manager session rejected. No customer data was returned." : "Appointment queue failed its truth-boundary check.");
        return false;
      }
      setItems(body.items);
      setMessage(body.items.length ? `${body.items.length} contacted customer${body.items.length === 1 ? "" : "s"} may have appointment evidence to review.` : "No CONTACTED opportunities currently await appointment confirmation.");
      return true;
    } catch {
      setItems([]);
      setMessage("Appointment queue unavailable. No customer state changed.");
      return false;
    }
  }

  async function unlock() {
    const session = draftToken.trim();
    if (!session) return setMessage("A manager session is required.");
    if (await load(session)) { setToken(session); setDraftToken(""); }
  }

  function lock() {
    setToken(""); setDraftToken(""); setItems([]); setRefs({}); setMessage("Manager session cleared from this tab.");
  }

  async function confirm(item: Item) {
    const evidenceRef = refs[item.opportunityId]?.trim() ?? "";
    if (!token || !evidenceRef || busy) return;
    setBusy(item.opportunityId);
    setMessage("Recording independently evidenced appointment confirmation…");
    try {
      const response = await fetch("/api/manager/progression/appointment", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: item.opportunityId, evidenceRef, observedAt: new Date().toISOString() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.protocol !== "NORAUTO_APPOINTMENT_CONFIRMATION_RESPONSE_V1" || body?.truthState !== "EVIDENCE_GATED_APPOINTMENT" || body?.authorityEffect !== "APPOINTMENT_RECORDED_ONLY") {
        setMessage(typeof body?.message === "string" ? body.message : "Appointment confirmation failed safely.");
        await load();
        return;
      }
      setRefs((current) => ({ ...current, [item.opportunityId]: "" }));
      await load();
    } catch {
      setMessage("Appointment confirmation could not be verified. Refresh before retrying.");
    } finally { setBusy(undefined); }
  }

  if (!token) return (
    <div className="mt-10 max-w-2xl rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl sm:p-8">
      <div className="flex items-start gap-4"><span className="grid size-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><LockKeyhole size={22}/></span><div><h2 className="text-xl font-black text-white">Manager session required</h2><p className="mt-2 text-sm leading-6 text-slate-400">No public session issuer exists. Appointment state stays closed without trusted manager identity.</p></div></div>
      <input type="password" value={draftToken} onChange={(e)=>setDraftToken(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") void unlock();}} autoComplete="off" className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" placeholder="Paste short-lived manager session" />
      <div className="mt-4 flex gap-3"><button type="button" onClick={()=>void unlock()} className="btn-primary"><ShieldCheck size={17}/> Verify and open</button><p className="text-xs leading-5 text-slate-500">{message}</p></div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><ShieldCheck size={17}/> Manager boundary verified</div><p className="mt-1 text-xs text-slate-500">This desk records a dealership-confirmed appointment. It does not create one from intent, a callback request, or a guess.</p></div><div className="flex gap-2"><button type="button" onClick={()=>void load()} className="btn-secondary px-4"><RefreshCw size={16}/> Refresh</button><button type="button" onClick={lock} className="btn-secondary px-4">Lock</button></div></div>
      <p className="mt-4 text-xs text-slate-400">{message}</p>
      <div className="mt-6 grid gap-5">{items.map((item)=><article key={item.opportunityId} className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">CONTACTED • {item.attribution.source}</div><h3 className="mt-2 text-2xl font-black text-white">{item.customer.firstName} {item.customer.lastName}</h3><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400"><a href={`tel:${item.customer.phone}`}>{item.customer.phone}</a><a href={`mailto:${item.customer.email}`}>{item.customer.email}</a></div></div><code className="text-[11px] text-slate-600">{item.opportunityId}</code></div><div className="mt-5 border-t border-white/10 pt-5"><label className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Appointment confirmation evidence</label><input value={refs[item.opportunityId]??""} onChange={(e)=>setRefs((c)=>({...c,[item.opportunityId]:e.target.value}))} maxLength={512} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none" placeholder="Reference to CRM/calendar/text evidence confirming the appointment"/><p className="mt-2 text-[11px] leading-5 text-slate-600">Use a durable evidence reference. Do not enter sensitive financial data. A customer asking for information is not appointment confirmation.</p><button type="button" disabled={Boolean(busy)||!(refs[item.opportunityId]??"").trim()} onClick={()=>void confirm(item)} className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"><CalendarCheck2 size={17}/>{busy===item.opportunityId?"Recording…":"Record confirmed appointment"}</button><p className="mt-3 text-[11px] leading-5 text-slate-600">Authority effect is limited to APPOINTMENT_RECORDED_ONLY. This does not approve financing, reserve inventory, or authorize SOLD/LOST.</p></div></article>)}</div>
    </div>
  );
}
