"use client";

import { useState } from "react";
import { Clock3, LockKeyhole, Mail, MessageSquareText, PhoneCall, RefreshCw, ShieldCheck } from "lucide-react";

type ConversationQueueItem = {
  workspaceId: string;
  provider: string;
  eventId: string;
  conversationId: string;
  eventType: string;
  observedAt: string;
  receivedAt: string;
  processingState: "RECEIVED";
  routingDecision: "CONTACTABLE" | "HUMAN_REVIEW_REQUIRED";
  routingReasons: string[];
  responseState: "RESPONSE_DUE" | "HUMAN_REVIEW_DUE";
  warningAt: string;
  targetAt: string;
  slaState: "WITHIN_TARGET" | "WARNING" | "OVERDUE";
  customer: {
    name: string | null;
    phone: string | null;
    email: string | null;
    preferredContact: "PHONE" | "TEXT" | "EMAIL" | null;
    communicationConsent: boolean | null;
  };
  intent: {
    category: string | null;
    subjectRefs: string[];
    questions: string[];
    constraints: string[];
    urgency: "LOW" | "NORMAL" | "HIGH" | null;
  };
  summary: string | null;
  evidence: {
    transcriptAvailable: boolean;
    sourceRef: string | null;
    sourceHash: string | null;
  };
  authorityEffect: "NONE";
};

type DeskState = "LOCKED" | "LOADING" | "READY" | "ERROR";

function slaLabel(value: ConversationQueueItem["slaState"]) {
  if (value === "OVERDUE") return "3-minute target missed";
  if (value === "WARNING") return "2-minute warning";
  return "Within target";
}

export function ConversationResponseDesk() {
  const [draftToken, setDraftToken] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [state, setState] = useState<DeskState>("LOCKED");
  const [items, setItems] = useState<ConversationQueueItem[]>([]);
  const [message, setMessage] = useState("Manager credentials remain only in this browser tab's memory.");

  async function loadQueue(token: string) {
    setState("LOADING");
    setMessage("Verifying the manager boundary and loading conversation-response obligations…");
    try {
      const response = await fetch("/api/manager/conversations/queue?limit=100", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (
        !response.ok ||
        body?.protocol !== "NORAUTO_CONVERSATION_RESPONSE_QUEUE_V1" ||
        body?.truthState !== "READ_MODEL_ONLY" ||
        body?.authorityEffect !== "NONE" ||
        !Array.isArray(body?.items)
      ) {
        setItems([]);
        setState("ERROR");
        setMessage(response.status === 401 ? "Manager session was rejected. No conversation data was returned." : "Conversation queue failed its truth-boundary check.");
        return false;
      }
      setItems(body.items as ConversationQueueItem[]);
      setState("READY");
      setMessage(body.items.length ? `${body.items.length} conversation response item${body.items.length === 1 ? "" : "s"} require attention.` : "No authorized conversation-response items are currently queued.");
      return true;
    } catch {
      setItems([]);
      setState("ERROR");
      setMessage("Conversation response queue is unavailable. No customer state was changed.");
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
    setState("LOCKED");
    setMessage("Manager session cleared from this tab. Conversation data is no longer displayed.");
  }

  if (!sessionToken) {
    return (
      <div className="mt-10 max-w-2xl rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><LockKeyhole size={22} /></span>
          <div>
            <h2 className="text-xl font-black text-white">Manager session required</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">This desk exposes customer conversation context only after the existing trusted manager boundary accepts a short-lived session.</p>
          </div>
        </div>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[.14em] text-slate-400" htmlFor="conversation-manager-session">Manager session</label>
        <input
          id="conversation-manager-session"
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
          <p className="mt-1 text-xs text-slate-500">This is a read-only continuity desk. Phone/email links do not claim a message was sent, delivered, or answered.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadQueue(sessionToken)} disabled={state === "LOADING"} className="btn-secondary px-4"><RefreshCw size={16} /> Refresh</button>
          <button type="button" onClick={lock} className="btn-secondary px-4">Lock</button>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">{message}</p>

      <div className="mt-6 grid gap-5">
        {items.map((item) => (
          <article key={`${item.provider}-${item.eventId}`} className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">
                  <span className={item.slaState === "OVERDUE" ? "rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-red-300" : item.slaState === "WARNING" ? "rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300" : "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300"}>{slaLabel(item.slaState)}</span>
                  <span>{item.provider}</span><span>•</span><span>{item.routingDecision.replaceAll("_", " ")}</span>
                </div>
                <h3 className="mt-3 text-2xl font-black text-white">{item.customer.name || "Customer name not supplied"}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                  {item.customer.phone ? <a className="inline-flex items-center gap-1.5 hover:text-amber-300" href={`tel:${item.customer.phone}`}><PhoneCall size={14} />{item.customer.phone}</a> : null}
                  {item.customer.email ? <a className="inline-flex items-center gap-1.5 hover:text-amber-300" href={`mailto:${item.customer.email}`}><Mail size={14} />{item.customer.email}</a> : null}
                </div>
              </div>
              <div className="text-left lg:text-right">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 lg:justify-end"><Clock3 size={14} /> Target {new Date(item.targetAt).toLocaleTimeString()}</div>
                <code className="mt-2 block text-[11px] text-slate-600">{item.conversationId}</code>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-amber-300"><MessageSquareText size={15} /> What the customer needs</div>
                {item.summary ? <p className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</p> : <p className="mt-3 text-sm text-slate-500">No provider summary supplied.</p>}
                {item.intent.questions.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">{item.intent.questions.map((question) => <li key={question}>• {question}</li>)}</ul> : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Response guardrails</div>
                <p className="mt-3 text-sm leading-6 text-slate-400">Preferred contact: <span className="font-bold text-white">{item.customer.preferredContact ?? "not stated"}</span>. Communication consent: <span className="font-bold text-white">{item.customer.communicationConsent === true ? "present" : item.customer.communicationConsent === false ? "not granted" : "unproven"}</span>.</p>
                {item.intent.constraints.length ? <div className="mt-3 text-sm leading-6 text-slate-400">Constraints: {item.intent.constraints.join(" • ")}</div> : null}
                {item.intent.subjectRefs.length ? <div className="mt-3 text-sm leading-6 text-slate-400">References: {item.intent.subjectRefs.join(" • ")}</div> : null}
                <p className="mt-3 text-[11px] leading-5 text-slate-600">Availability, price, incentive, financing, reservation, appointment, SOLD, and LOST claims still require their own current evidence. This queue grants no authority to invent them.</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
