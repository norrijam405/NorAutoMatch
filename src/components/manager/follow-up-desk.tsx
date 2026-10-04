"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, LockKeyhole, PhoneCall, RefreshCw, ShieldCheck } from "lucide-react";

type FollowUpItem = {
  opportunityId: string;
  pipeline: string;
  stage: string;
  obligationType: "FIRST_CONTACT" | "FOLLOW_UP";
  dueAt: string;
  urgency: "OVERDUE" | "DUE_SOON" | "UPCOMING";
  customer: { firstName: string; lastName: string; email: string; phone: string };
  attribution: { source: string };
  authorityEffect: "NONE";
};

type DeskState = "LOCKED" | "LOADING" | "READY" | "ERROR";

export function FollowUpDesk() {
  const [draftToken, setDraftToken] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [state, setState] = useState<DeskState>("LOCKED");
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [evidenceRefs, setEvidenceRefs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Manager credentials remain only in this browser tab's memory.");
  const [busyId, setBusyId] = useState<string>();

  async function loadQueue(token: string) {
    setState("LOADING");
    setMessage("Verifying the manager boundary and loading due follow-up obligations…");
    try {
      const response = await fetch("/api/manager/follow-up/queue?limit=100", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.protocol !== "NORAUTO_FOLLOW_UP_QUEUE_RESPONSE_V1" || body?.truthState !== "READ_MODEL_ONLY" || body?.authorityEffect !== "NONE" || !Array.isArray(body?.items)) {
        setItems([]);
        setState("ERROR");
        setMessage(response.status === 401 ? "Manager session was rejected. No customer queue data was returned." : "Follow-up queue failed its truth-boundary check.");
        return false;
      }
      setItems(body.items as FollowUpItem[]);
      setState("READY");
      setMessage(body.items.length ? `${body.items.length} follow-up obligation${body.items.length === 1 ? "" : "s"} require attention.` : "No unsatisfied follow-up obligations are currently due.");
      return true;
    } catch {
      setItems([]);
      setState("ERROR");
      setMessage("Follow-up queue is unavailable. No customer state was changed.");
      return false;
    }
  }

  async function unlock() {
    const token = draftToken.trim();
    if (!token) {
      setState("ERROR");
      setMessage("A manager session is required.");
      return;
    }
    if (await loadQueue(token)) {
      setSessionToken(token);
      setDraftToken("");
    }
  }

  function lock() {
    setSessionToken("");
    setDraftToken("");
    setItems([]);
    setEvidenceRefs({});
    setState("LOCKED");
    setMessage("Manager session cleared from this tab. Customer data is no longer displayed.");
  }

  async function applyEvidenceCommand(item: FollowUpItem, command: "ATTEMPT" | "CONFIRM") {
    if (!sessionToken || busyId) return;
    const evidenceRef = evidenceRefs[item.opportunityId]?.trim() ?? "";
    if (!evidenceRef) {
      setMessage("An evidence reference is required before any follow-up state can change.");
      return;
    }

    setBusyId(item.opportunityId);
    setMessage(command === "ATTEMPT" ? "Recording an evidence-bound contact attempt…" : "Recording evidence that the customer was actually reached…");
    const endpoint = command === "ATTEMPT" ? "/api/manager/follow-up/attempt" : "/api/manager/follow-up/confirm";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunityId: item.opportunityId,
          evidenceRef,
          observedAt: new Date().toISOString(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(typeof body?.message === "string" ? body.message : "Follow-up command failed safely.");
        await loadQueue(sessionToken);
        return;
      }
      if (body?.authorityEffect !== "NONE") {
        setMessage("Follow-up response violated the no-deal-authority boundary. Queue refresh required.");
        await loadQueue(sessionToken);
        return;
      }
      setEvidenceRefs((current) => ({ ...current, [item.opportunityId]: "" }));
      await loadQueue(sessionToken);
    } catch {
      setMessage("Follow-up command could not be confirmed. Refresh before retrying.");
    } finally {
      setBusyId(undefined);
    }
  }

  if (!sessionToken) {
    return (
      <div className="mt-10 max-w-2xl rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><LockKeyhole size={22} /></span>
          <div>
            <h2 className="text-xl font-black text-white">Manager session required</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">There is no public session issuer. This desk only accepts a short-lived token from the trusted identity boundary.</p>
          </div>
        </div>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[.14em] text-slate-400" htmlFor="follow-up-manager-session">Manager session</label>
        <input
          id="follow-up-manager-session"
          type="password"
          value={draftToken}
          onChange={(event) => setDraftToken(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void unlock(); }}
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
          placeholder="Paste short-lived manager session"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => void unlock()} disabled={state === "LOADING"} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            {state === "LOADING" ? <RefreshCw className="animate-spin" size={17} /> : <ShieldCheck size={17} />} Verify and open
          </button>
          <p className="text-xs leading-5 text-slate-500">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><ShieldCheck size={17} /> Manager boundary verified</div>
          <p className="mt-1 text-xs text-slate-500">An attempt satisfies the response obligation without claiming the customer was reached. Contact confirmation is a separate evidence-gated action.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadQueue(sessionToken)} disabled={state === "LOADING" || Boolean(busyId)} className="btn-secondary px-4"><RefreshCw size={16} /> Refresh</button>
          <button type="button" onClick={lock} className="btn-secondary px-4">Lock</button>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">{message}</p>

      <div className="mt-6 grid gap-5">
        {items.map((item) => {
          const evidenceRef = evidenceRefs[item.opportunityId] ?? "";
          const busy = busyId === item.opportunityId;
          return (
            <article key={`${item.opportunityId}-${item.obligationType}`} className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">
                    <span className={item.urgency === "OVERDUE" ? "rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-red-300" : item.urgency === "DUE_SOON" ? "rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300" : "rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-slate-300"}>{item.urgency.replace("_", " ")}</span>
                    <span>{item.obligationType.replace("_", " ")}</span><span>•</span><span>{item.stage}</span><span>•</span><span>{item.attribution.source}</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-white">{item.customer.firstName} {item.customer.lastName}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <a className="hover:text-amber-300" href={`tel:${item.customer.phone}`}>{item.customer.phone}</a>
                    <a className="hover:text-amber-300" href={`mailto:${item.customer.email}`}>{item.customer.email}</a>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 lg:justify-end"><Clock3 size={14} /> Due {new Date(item.dueAt).toLocaleString()}</div>
                  <code className="mt-2 block text-[11px] text-slate-600">{item.opportunityId}</code>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <label className="text-xs font-bold uppercase tracking-[.14em] text-slate-500" htmlFor={`evidence-${item.opportunityId}`}>Evidence reference</label>
                <input
                  id={`evidence-${item.opportunityId}`}
                  value={evidenceRef}
                  maxLength={512}
                  onChange={(event) => setEvidenceRefs((current) => ({ ...current, [item.opportunityId]: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  placeholder="Example: call-log:2026-09-10T07:30Z or crm-note:abc123"
                />
                <p className="mt-2 text-[11px] leading-5 text-slate-600">Use a reference to evidence that can be independently checked later. Do not type passwords, SSNs, card numbers, or other sensitive financial data.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" disabled={Boolean(busyId) || !evidenceRef.trim()} onClick={() => void applyEvidenceCommand(item, "ATTEMPT")} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"><PhoneCall size={17} /> {busy ? "Recording…" : "Record contact attempt"}</button>
                  <button type="button" disabled={Boolean(busyId) || !evidenceRef.trim()} onClick={() => void applyEvidenceCommand(item, "CONFIRM")} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={17} /> Confirm customer reached</button>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-600">Authority boundary: these actions record evidence-backed communication state only. They do not approve financing, reserve inventory, set an appointment, or authorize SOLD/LOST.</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
