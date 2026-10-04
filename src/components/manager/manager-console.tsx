"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, LogOut, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";

type QueueItem = {
  protocol: "NORAUTO_MANAGER_QUEUE_ITEM_V1";
  truthState: "READ_MODEL_ONLY";
  authorityEffect: "NONE";
  opportunityId: string;
  pipeline: string;
  stage: string;
  deskState: "MANAGER_REVIEW_PENDING";
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  buyingIntent: {
    budgetRange: string;
    paymentMethod: string;
    monthlyTarget?: number;
    downPayment?: number;
    termMonths?: number;
    tradeIn?: string;
    notes?: string;
  };
  attribution: { source: string };
  managerHandoff: {
    handoffId: string;
    workflowState: "MANAGER_REVIEW_PENDING";
    authority: { approveDeal?: string };
  };
  createdAt: string;
};

type QueueResponse = {
  protocol: "NORAUTO_MANAGER_QUEUE_RESPONSE_V1";
  truthState: "READ_MODEL_ONLY";
  authorityEffect: "NONE";
  items: QueueItem[];
};

type WorkbenchState = "LOCKED" | "LOADING" | "READY" | "ERROR";

export function ManagerConsole() {
  const [draftToken, setDraftToken] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [state, setState] = useState<WorkbenchState>("LOCKED");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [message, setMessage] = useState("Manager credentials stay in this browser tab's memory only and are never placed in the URL.");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string>();

  const pendingCount = useMemo(() => items.length, [items]);

  async function readQueue(token: string) {
    setState("LOADING");
    setMessage("Checking the manager boundary and loading the persisted review queue…");
    try {
      const response = await fetch("/api/manager/queue?limit=50", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setItems([]);
        setState("ERROR");
        setMessage(response.status === 401
          ? "Manager session was rejected. No customer data was returned."
          : typeof body?.message === "string" ? body.message : "Manager queue could not be loaded safely.");
        return false;
      }
      const queue = body as QueueResponse;
      if (queue.protocol !== "NORAUTO_MANAGER_QUEUE_RESPONSE_V1" || queue.truthState !== "READ_MODEL_ONLY" || queue.authorityEffect !== "NONE" || !Array.isArray(queue.items)) {
        setItems([]);
        setState("ERROR");
        setMessage("The manager queue response failed its truth-boundary check.");
        return false;
      }
      setItems(queue.items);
      setState("READY");
      setMessage(queue.items.length
        ? `${queue.items.length} persisted request${queue.items.length === 1 ? "" : "s"} awaiting manager review.`
        : "No requests are currently awaiting manager review.");
      return true;
    } catch {
      setItems([]);
      setState("ERROR");
      setMessage("Manager queue is unavailable. No review action was attempted.");
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
    const accepted = await readQueue(token);
    if (accepted) {
      setSessionToken(token);
      setDraftToken("");
    }
  }

  function lock() {
    setSessionToken("");
    setDraftToken("");
    setItems([]);
    setNotes({});
    setState("LOCKED");
    setMessage("Manager session cleared from this tab. Customer queue data is no longer displayed.");
  }

  async function review(item: QueueItem, decision: "ACKNOWLEDGED" | "RETURNED_FOR_CLARIFICATION") {
    if (!sessionToken || busyId) return;
    setBusyId(item.opportunityId);
    setMessage(decision === "ACKNOWLEDGED" ? "Recording manager acknowledgement…" : "Returning request for clarification…");
    try {
      const response = await fetch("/api/manager/review", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunityId: item.opportunityId,
          expectedHandoffId: item.managerHandoff.handoffId,
          decision,
          note: notes[item.opportunityId]?.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(response.status === 409
          ? "That request changed while it was open. Refreshing before any retry."
          : typeof body?.message === "string" ? body.message : "Manager review failed safely.");
        await readQueue(sessionToken);
        return;
      }
      if (body?.authorityEffect !== "NONE") {
        setMessage("Review response violated the no-deal-authority boundary. Refresh required.");
        await readQueue(sessionToken);
        return;
      }
      setNotes((current) => ({ ...current, [item.opportunityId]: "" }));
      await readQueue(sessionToken);
    } catch {
      setMessage("Manager review could not be confirmed. Refresh the queue before retrying.");
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
            <p className="mt-2 text-sm leading-6 text-slate-400">There is intentionally no public session issuer on this site. Only a short-lived token from the trusted identity boundary can unlock the workbench.</p>
          </div>
        </div>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[.14em] text-slate-400" htmlFor="manager-session">Manager session</label>
        <input
          id="manager-session"
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
          <p className="mt-1 text-xs text-slate-500">Read model only until you explicitly record a review receipt. Reviewing a handoff never approves a deal.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void readQueue(sessionToken)} disabled={state === "LOADING" || Boolean(busyId)} className="btn-secondary px-4"><RefreshCw size={16} /> Refresh</button>
          <button type="button" onClick={lock} className="btn-secondary px-4"><LogOut size={16} /> Lock</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5"><strong className="text-white">{pendingCount}</strong> pending</span>
        <span>{message}</span>
      </div>

      <div className="mt-6 grid gap-5">
        {items.map((item) => {
          const busy = busyId === item.opportunityId;
          const intent = item.buyingIntent;
          return (
            <article key={item.opportunityId} className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">{item.pipeline}</span>
                    <span>{item.stage}</span><span>•</span><span>{item.attribution.source}</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-white">{item.customer.firstName} {item.customer.lastName}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <a className="hover:text-amber-300" href={`tel:${item.customer.phone}`}>{item.customer.phone}</a>
                    <a className="hover:text-amber-300" href={`mailto:${item.customer.email}`}>{item.customer.email}</a>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xs font-bold text-slate-500">Request reference</div>
                  <code className="mt-1 block text-xs text-slate-300">{item.opportunityId}</code>
                  <div className="mt-2 text-[11px] text-slate-600">Received {new Date(item.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Budget lane" value={intent.budgetRange} />
                <Fact label="Payment method" value={intent.paymentMethod} />
                <Fact label="Monthly target" value={intent.monthlyTarget ? `$${intent.monthlyTarget.toLocaleString()}` : "Not supplied"} />
                <Fact label="Down payment" value={typeof intent.downPayment === "number" ? `$${intent.downPayment.toLocaleString()}` : "Not supplied"} />
              </div>

              {(intent.tradeIn || intent.notes) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {intent.tradeIn && <Fact label="Trade-in" value={intent.tradeIn} wide />}
                  {intent.notes && <Fact label="Customer notes" value={intent.notes} wide />}
                </div>
              )}

              <div className="mt-6 border-t border-white/10 pt-5">
                <label htmlFor={`note-${item.opportunityId}`} className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Manager review note</label>
                <textarea
                  id={`note-${item.opportunityId}`}
                  value={notes[item.opportunityId] ?? ""}
                  maxLength={2000}
                  onChange={(event) => setNotes((current) => ({ ...current, [item.opportunityId]: event.target.value }))}
                  className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-amber-300/50"
                  placeholder="Optional evidence/context note. No deal approval is implied."
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <button type="button" disabled={Boolean(busyId)} onClick={() => void review(item, "ACKNOWLEDGED")} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 size={17} /> {busy ? "Recording…" : "Acknowledge handoff"}
                  </button>
                  <button type="button" disabled={Boolean(busyId)} onClick={() => void review(item, "RETURNED_FOR_CLARIFICATION")} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
                    <RotateCcw size={17} /> Return for clarification
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-600">Authority boundary: these actions only record manager review state. They cannot mark a customer contacted, set an appointment, approve financing, reserve a vehicle, or mark an opportunity SOLD/LOST.</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Fact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950/35 p-4 ${wide ? "min-h-24" : ""}`}>
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-slate-200">{value}</div>
    </div>
  );
}
