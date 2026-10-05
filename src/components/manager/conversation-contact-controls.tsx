"use client";

import { useState } from "react";
import { Mail, MessageCircle, PhoneCall, RefreshCw, Send, ShieldCheck } from "lucide-react";

type Channel = "EMAIL" | "TEXT" | "PHONE";

type Props = {
  sessionToken: string;
  viewerSubjectId: string;
  item: {
    provider: string;
    eventId: string;
    conversationId: string;
    customer: {
      phone: string | null;
      email: string | null;
      preferredContact: Channel | null;
      communicationConsent: boolean | null;
    };
    ownership: {
      assigneeSubjectId: string | null;
    };
  };
};

type HistoryEvent = {
  communicationEventId: string;
  channel: Channel;
  eventType: "CHANNEL_HANDOFF_OPENED" | "OUTBOUND_EXECUTION_RECORDED" | "DELIVERY_EVIDENCE_RECORDED";
  actorSubjectId: string;
  targetHint: string;
  evidenceAuthority: string;
  evidenceRef: string | null;
  deliveryOutcome: "DELIVERED" | "FAILED" | null;
  createdAt: string;
};

type History = {
  protocol: "NORAUTO_COMMUNICATION_HISTORY_V1";
  truthState: "APPEND_ONLY_EVIDENCE_READ_MODEL";
  status: {
    executionState: "NOT_CLAIMED" | "HUMAN_RECORDED";
    deliveryState: "NOT_CLAIMED" | "DELIVERY_EVIDENCE_RECORDED_DELIVERED" | "DELIVERY_EVIDENCE_RECORDED_FAILED";
    customerReachedState: "NOT_CLAIMED";
  };
  events: HistoryEvent[];
  authorityEffect: "NONE";
};

function channelLabel(channel: Channel) {
  if (channel === "EMAIL") return "email";
  if (channel === "TEXT") return "text";
  return "call";
}

export function ConversationContactControls({ sessionToken, viewerSubjectId, item }: Props) {
  const [draft, setDraft] = useState("");
  const [executionEvidence, setExecutionEvidence] = useState("");
  const [deliveryEvidence, setDeliveryEvidence] = useState("");
  const [deliveryOutcome, setDeliveryOutcome] = useState<"DELIVERED" | "FAILED">("DELIVERED");
  const [history, setHistory] = useState<History | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No external send or delivery is claimed until a human records evidence.");

  const channel = item.customer.preferredContact;
  const isOwner = item.ownership.assigneeSubjectId === viewerSubjectId;
  const targetAvailable = channel === "EMAIL" ? Boolean(item.customer.email) : channel ? Boolean(item.customer.phone) : false;
  const eligible = item.customer.communicationConsent === true && Boolean(channel) && targetAvailable && isOwner;

  async function record(action: "HANDOFF_OPENED" | "EXECUTION_RECORDED" | "DELIVERY_EVIDENCE_RECORDED", extras?: {
    evidenceRef?: string;
    deliveryOutcome?: "DELIVERED" | "FAILED";
  }) {
    if (!channel) return null;
    const response = await fetch("/api/manager/conversations/contact-action", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: item.provider,
        eventId: item.eventId,
        channel,
        action,
        clientActionId: crypto.randomUUID(),
        ...extras,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.protocol !== "NORAUTO_COMMUNICATION_LEDGER_V1") {
      throw new Error(typeof body?.message === "string" ? body.message : "Communication evidence action failed.");
    }
    return body;
  }

  async function loadHistory() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/manager/conversations/history?provider=${encodeURIComponent(item.provider)}&conversationId=${encodeURIComponent(item.conversationId)}`,
        { headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store" },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.protocol !== "NORAUTO_COMMUNICATION_HISTORY_V1" || body?.authorityEffect !== "NONE") {
        throw new Error(typeof body?.message === "string" ? body.message : "Communication history failed.");
      }
      setHistory(body as History);
      setMessage("Communication evidence history refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication history is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function openPreferredChannel() {
    if (!eligible || !channel || busy) return;
    if ((channel === "EMAIL" || channel === "TEXT") && !draft.trim()) {
      setMessage("Write the human-reviewed message before opening the preferred channel.");
      return;
    }
    setBusy(true);
    try {
      await record("HANDOFF_OPENED");
      const body = encodeURIComponent(draft.trim());
      if (channel === "EMAIL" && item.customer.email) {
        window.location.href = `mailto:${item.customer.email}?subject=${encodeURIComponent("Your NorAutoMatch inquiry")}&body=${body}`;
      } else if (channel === "TEXT" && item.customer.phone) {
        window.location.href = `sms:${item.customer.phone}?&body=${body}`;
      } else if (channel === "PHONE" && item.customer.phone) {
        window.location.href = `tel:${item.customer.phone}`;
      }
      setMessage("Preferred external app opened. NorAutoMatch still does not claim a send, delivery, answer, or customer contact.");
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The external handoff was not recorded, so the app was not opened.");
    } finally {
      setBusy(false);
    }
  }

  async function recordExecution() {
    if (!eligible || !channel || busy) return;
    const evidenceRef = executionEvidence.trim();
    if (!evidenceRef) {
      setMessage("Add a bounded evidence reference before recording the human execution.");
      return;
    }
    setBusy(true);
    try {
      await record("EXECUTION_RECORDED", { evidenceRef });
      setExecutionEvidence("");
      setMessage(channel === "PHONE"
        ? "Human-recorded call placement saved. NorAutoMatch does not claim the customer answered or was reached."
        : "Human-recorded outbound execution saved. Delivery is still not claimed.");
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution evidence could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function recordDelivery() {
    if (!eligible || !channel || channel === "PHONE" || busy) return;
    const evidenceRef = deliveryEvidence.trim();
    if (!evidenceRef) {
      setMessage("Add the provider/dealership delivery receipt reference first.");
      return;
    }
    setBusy(true);
    try {
      await record("DELIVERY_EVIDENCE_RECORDED", { evidenceRef, deliveryOutcome });
      setDeliveryEvidence("");
      setMessage(`Delivery evidence recorded as ${deliveryOutcome.toLowerCase()}. Customer-reached state remains unclaimed.`);
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivery evidence could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-sky-300">
            <ShieldCheck size={14} /> Human contact execution
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Preferred channel: <span className="font-bold text-slate-300">{channel ?? "not stated"}</span>.
            Opening a phone/email/text app is only a handoff. A separate human evidence action records execution; a separate receipt records delivery evidence.
          </p>
        </div>
        <button type="button" onClick={() => void loadHistory()} disabled={busy} className="btn-secondary px-3 py-2">
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> History
        </button>
      </div>

      {!isOwner ? <p className="mt-3 text-xs text-amber-300">Claim this conversation before using human contact actions.</p> : null}
      {item.customer.communicationConsent !== true ? <p className="mt-3 text-xs text-amber-300">Communication consent is not proven. External contact actions remain disabled.</p> : null}
      {channel && !targetAvailable ? <p className="mt-3 text-xs text-amber-300">The stated preferred contact route is missing.</p> : null}
      {!channel ? <p className="mt-3 text-xs text-amber-300">The customer did not state a preferred contact channel.</p> : null}

      {(channel === "EMAIL" || channel === "TEXT") ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={3000}
          disabled={!eligible}
          className="field mt-3 min-h-28 disabled:opacity-50"
          placeholder="Write the human-reviewed outbound message…"
        />
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void openPreferredChannel()} disabled={!eligible || busy} className="btn-primary disabled:opacity-50">
          {channel === "EMAIL" ? <Mail size={16} /> : channel === "TEXT" ? <MessageCircle size={16} /> : <PhoneCall size={16} />}
          {channel ? `Open preferred ${channelLabel(channel)}` : "Preferred channel unavailable"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <div className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
            {channel === "PHONE" ? "Record call placed" : "Record human send"}
          </div>
          <input
            value={executionEvidence}
            onChange={(event) => setExecutionEvidence(event.target.value)}
            disabled={!eligible}
            maxLength={512}
            className="field mt-3 disabled:opacity-50"
            placeholder="Evidence ref, e.g. provider message id or call-log ref"
          />
          <button type="button" onClick={() => void recordExecution()} disabled={!eligible || busy} className="btn-secondary mt-3 disabled:opacity-50">
            <Send size={14} /> Record execution
          </button>
          <p className="mt-2 text-[11px] leading-5 text-slate-600">This is a rep evidence record only. It never proves delivery or that the customer was reached.</p>
        </div>

        {channel === "EMAIL" || channel === "TEXT" ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <div className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">Record provider delivery evidence</div>
            <div className="mt-3 flex gap-2">
              <select value={deliveryOutcome} onChange={(event) => setDeliveryOutcome(event.target.value as "DELIVERED" | "FAILED")} disabled={!eligible} className="field">
                <option value="DELIVERED">Delivered receipt</option>
                <option value="FAILED">Failed receipt</option>
              </select>
            </div>
            <input
              value={deliveryEvidence}
              onChange={(event) => setDeliveryEvidence(event.target.value)}
              disabled={!eligible}
              maxLength={512}
              className="field mt-3 disabled:opacity-50"
              placeholder="Provider/dealership receipt reference"
            />
            <button type="button" onClick={() => void recordDelivery()} disabled={!eligible || busy} className="btn-secondary mt-3 disabled:opacity-50">
              <ShieldCheck size={14} /> Record delivery evidence
            </button>
            <p className="mt-2 text-[11px] leading-5 text-slate-600">The receipt is preserved as reported evidence; NorAutoMatch does not infer a reply, appointment, reservation, financing result, SOLD, or LOST.</p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">{message}</p>

      {history ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <div className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">Durable contact history</div>
          <p className="mt-2 text-xs text-slate-500">
            Execution: {history.status.executionState.replaceAll("_", " ").toLowerCase()} • Delivery: {history.status.deliveryState.replaceAll("_", " ").toLowerCase()} • Customer reached: not claimed
          </p>
          <div className="mt-3 space-y-2">
            {history.events.length ? history.events.map((event) => (
              <div key={event.communicationEventId} className="rounded-xl border border-white/5 px-3 py-2 text-xs text-slate-400">
                <div className="font-bold text-slate-300">{event.eventType.replaceAll("_", " ")} · {event.channel}</div>
                <div className="mt-1">{new Date(event.createdAt).toLocaleString()} · {event.targetHint}</div>
                {event.evidenceRef ? <div className="mt-1 break-all text-slate-500">Evidence: {event.evidenceRef}</div> : null}
                {event.deliveryOutcome ? <div className="mt-1 text-slate-500">Receipt outcome: {event.deliveryOutcome}</div> : null}
              </div>
            )) : <p className="text-xs text-slate-600">No external contact evidence has been recorded for this conversation.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
