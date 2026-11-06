"use client";

import Link from "next/link";
import { Bot, ChevronDown, ExternalLink, Loader2, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { LeadModal } from "@/components/matcher/lead-modal";

type Match = {
  id: string;
  label: string;
  price: number;
  mileage: number;
  mileageVerified?: boolean;
  type: string;
  drivetrain: string;
  fit: "exact" | "strong" | "near";
  reasons: string[];
  compromises: string[];
};

type TorqueResponse = {
  answer?: string;
  message?: string;
  truthState?: string;
  mode?: string;
  needsMoreDetail?: boolean;
  matches?: Match[];
  exactCount?: number;
  handoff?: { required?: boolean; reason?: string; summary?: string };
  matchDna?: { signalCount: number; label: string } | null;
  battle?: { vins: string[]; priority: string; signals?: unknown[]; evidenceGaps?: string[] };
  customerRequirements?: string[];
  nextAction?: {
    protocol: "NORAUTO_TORQUE_NEXT_ACTION_V1";
    state: "PROPOSAL_ONLY";
    nextAction: "VERIFY_INVENTORY" | "HUMAN_SOURCE_NETWORK" | "VERIFY_MUST_HAVES" | "REVIEW_EXACT_OPTIONS";
    context: string;
    suggestedQuestions: string[];
  };
};

type Turn = {
  role: "user" | "torque";
  text: string;
  response?: TorqueResponse;
};

export function TorqueChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [dealershipId, setDealershipId] = useState("orr-nissan-west");
  const [busy, setBusy] = useState(false);
  const [battleContext, setBattleContext] = useState<{vins: string[]; priority: string} | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{vins:string[];priority:string;message:string}>).detail;
      if (!detail || !Array.isArray(detail.vins) || detail.vins.length !== 2) return;
      setBattleContext({vins: detail.vins, priority: detail.priority});
      setInput(detail.message.slice(0,1200));
      setDealershipId("orr-nissan-west");
      setOpen(true);
    };
    window.addEventListener("norauto:ask-torque-battle", handler);
    return () => window.removeEventListener("norauto:ask-torque-battle", handler);
  }, []);

  const [sourcingOpen, setSourcingOpen] = useState(false);
  const [sourcingRequest, setSourcingRequest] = useState("");
  const [sourcingContext, setSourcingContext] = useState("");
  const [sourcingVehicleIds, setSourcingVehicleIds] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "torque",
      text: "Ask me about a car, or compare two models directly—like Rogue versus Kicks. Tell me what matters to you, and I'll distinguish verified facts from anything I can't confirm.",
    },
  ]);

  function openSourcing(turn: Turn, index: number) {
    const priorUserText = index > 0 && turns[index - 1]?.role === "user" ? turns[index - 1].text : "";
    const request = priorUserText || turn.response?.handoff?.summary || "";
    setSourcingRequest(request);
    setSourcingContext(turn.response?.handoff?.summary || request);
    setSourcingVehicleIds(
      (turn.response?.matches ?? [])
        .map((match) => match.id)
        .filter((id) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(id))
        .slice(0, 20),
    );
    setOpen(false);
    setSourcingOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    const recentMessages = battleContext ? [] : turns.filter(turn => turn.role === "user").map(turn => turn.text).filter(text => text.length <= 400).slice(-10);

    setTurns((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/torque/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, dealershipId, ...(battleContext ? { battle: battleContext } : { recentMessages }) }),
      });
      const body = (await response.json().catch(() => ({}))) as TorqueResponse;
      if (body.battle?.vins?.length === 2 && typeof body.battle.priority === "string") {
        setBattleContext({ vins: body.battle.vins, priority: body.battle.priority });
      }
      const text =
        body.answer ||
        body.message ||
        "I couldn't verify that cleanly yet. I’d rather stop than make something up.";
      setTurns((current) => [...current, { role: "torque", text, response: body }]);
    } catch {
      setTurns((current) => [
        ...current,
        {
          role: "torque",
          text: "The inventory connection didn't answer cleanly. I’m not going to guess — try again or use the direct sourcing path.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[70] inline-flex min-h-14 items-center gap-3 rounded-full border border-amber-300/30 bg-[#111820] px-5 text-sm font-black text-white shadow-2xl shadow-black/50 transition hover:-translate-y-0.5 hover:border-amber-300/60 sm:bottom-7 sm:right-7"
          aria-label="Ask Torque"
        >
          <span className="grid size-9 place-items-center rounded-full bg-amber-300 text-black"><Bot size={19} /></span>
          <span>Ask Torque</span>
          <Sparkles size={15} className="text-amber-300" />
        </button>
      )}

      {open && (
        <section className="fixed inset-x-3 bottom-3 z-[80] flex max-h-[82vh] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1119] shadow-2xl shadow-black/60 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[430px]">
          <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0e1721] px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-300 text-black"><Bot size={20} /></span>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Torque</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">Inventory truth + MatchDNA</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => {
                setTurns([{ role: "torque", text: "Fresh start. Tell me what vehicle you're considering and what matters most." }]);
                setBattleContext(null); setInput("");
              }} disabled={busy} className="rounded-lg border border-white/15 px-2 py-2 text-[11px] font-bold text-slate-300 disabled:opacity-40">
                New search
              </button>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white" aria-label="Close Torque"><X size={18} /></button>
            </div>
          </header>

          <div className="border-b border-white/10 bg-white/[.025] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">What can Torque help with?</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Suggested Torque questions">
              {[
                "Find a family SUV under $30,000",
                "I need a used AWD Rogue",
                "Compare Rogue versus Kicks",
              ].map((prompt) => (
                <button key={prompt} type="button" disabled={busy} onClick={() => setInput(prompt)}
                  className="shrink-0 rounded-full border border-white/15 bg-white/[.045] px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:border-amber-300/50 disabled:opacity-40">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {turns.map((turn, index) => (
              <div key={index} className={turn.role === "user" ? "ml-8" : "mr-4"}>
                <div className={turn.role === "user"
                  ? "rounded-2xl rounded-br-md bg-white/[.07] px-4 py-3 text-sm leading-6 text-slate-100"
                  : "rounded-2xl rounded-bl-md border border-amber-300/10 bg-amber-300/[.04] px-4 py-3 text-sm leading-6 text-slate-200"}>
                  {turn.text}
                </div>

                {turn.role === "torque" && turn.response?.mode && (
                  <div role="status" className={turn.response.mode === "representative-demo"
                    ? "mt-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[11px] leading-5 text-amber-100"
                    : "mt-2 rounded-xl border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-[11px] leading-5 text-emerald-100"}>
                    {turn.response.mode === "representative-demo"
                      ? "SAMPLE INVENTORY ONLY — These vehicles are demonstrations, not confirmed Orr Nissan West stock. Torque cannot confirm availability or absence."
                      : turn.response.mode === "verified-cache"
                        ? "VERIFIED CACHED CATALOG — Previously source-verified records, not a live availability promise. Confirm the VIN with the store."
                        : "VERIFIED SOURCE CATALOG — Source-checked dealer records, but sale availability may have changed. Confirm the VIN with the store."}
                  </div>
                )}

                {turn.role === "torque" && turn.response?.customerRequirements && turn.response.customerRequirements.length > 0 && (
                  <p className="mt-2 text-[11px] leading-5 text-slate-400">
                    Remembering from this chat: {turn.response.customerRequirements.join(" · ")}
                  </p>
                )}

                {turn.role === "torque" && turn.response?.nextAction && (
                  <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.045] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">Torque's recommended next step</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {{
                        VERIFY_INVENTORY: "Verify the dealership listing",
                        HUMAN_SOURCE_NETWORK: "Ask a salesperson to search the network",
                        VERIFY_MUST_HAVES: "Confirm equipment on the exact VIN",
                        REVIEW_EXACT_OPTIONS: "Review your best matching vehicles",
                      }[turn.response.nextAction.nextAction]}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{turn.response.nextAction.context}</p>
                    {turn.response.nextAction.suggestedQuestions.slice(0, 2).map((question) => (
                      <button key={question} type="button" disabled={busy} onClick={() => setInput(question)}
                        className="mt-2 block w-full rounded-xl border border-white/10 bg-white/[.045] px-3 py-2 text-left text-[11px] font-semibold leading-5 text-amber-100 hover:border-amber-300/40 disabled:opacity-40">
                        Ask: {question}
                      </button>
                    ))}
                    <p className="mt-2 text-[10px] text-slate-500">Suggestion only — no appointment, reservation, or sourcing request has been submitted.</p>
                  </div>
                )}

                {turn.role === "torque" && turn.response?.matchDna && turn.response.matchDna.signalCount > 0 && (
                  <div className="mt-2 rounded-xl border border-red-400/15 bg-red-400/[.04] px-3 py-2 text-[11px] text-red-100/75">
                    MatchDNA · {turn.response.matchDna.label}
                  </div>
                )}

                {turn.role === "torque" && turn.response?.matches && turn.response.matches.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {turn.response.matches.slice(0, 3).map((match) => {
                      const vehicleHref = /^[A-HJ-NPR-Z0-9]{17}$/i.test(match.id)
                        ? `/vehicles/${encodeURIComponent(match.id)}`
                        : "/inventory";
                      return (
                        <article key={match.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className={match.fit === "exact"
                                ? "text-[9px] font-black uppercase tracking-[.14em] text-emerald-300"
                                : match.fit === "strong"
                                  ? "text-[9px] font-black uppercase tracking-[.14em] text-blue-200"
                                  : "text-[9px] font-black uppercase tracking-[.14em] text-amber-300"}>
                                {match.fit === "exact" ? "Exact fit" : match.fit === "strong" ? "Strong fit" : "Near fit"}
                              </span>
                              <h3 className="mt-1 text-sm font-black text-white">{match.label}</h3>
                            </div>
                            <span className="shrink-0 text-sm font-black text-amber-300">${match.price.toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{match.mileageVerified === false ? "Mileage not verified" : `${match.mileage.toLocaleString()} mi`} · {match.drivetrain} · {match.type}</p>
                          {match.reasons.length > 0 && <p className="mt-2 text-[11px] leading-5 text-emerald-200/70">✓ {match.reasons.slice(0, 3).join(" · ")}</p>}
                          {match.compromises.length > 0 && <p className="mt-1 text-[11px] leading-5 text-amber-100/65">Tradeoff: {match.compromises.slice(0, 2).join(" · ")}</p>}
                          <Link href={vehicleHref} className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-amber-300 hover:text-amber-200">
                            View inventory <ExternalLink size={12} />
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                )}

                {turn.role === "torque" && turn.response?.handoff?.required && (
                  <div className="mt-3 rounded-2xl border border-blue-300/15 bg-blue-300/[.04] p-3">
                    <p className="text-[9px] font-black uppercase tracking-[.14em] text-blue-200">Sourcing path</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">I don't have to stop at the visible local catalog. A salesperson can use the broader sourcing network to verify the exact spec.</p>
                    <button
                      type="button"
                      onClick={() => openSourcing(turn, index)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-blue-200"
                    >
                      Start sourcing request <ChevronDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="mr-4 inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/[.03] px-4 py-3 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Torque is checking the inventory…
              </div>
            )}
          </div>

          {battleContext && <div role="status" className="flex items-center justify-between gap-2 border-t border-amber-300/20 bg-amber-300/[.06] px-4 py-2 text-xs text-amber-100"><span>Garage Battle mode: Torque keeps your two selected VINs for follow-up questions. Change topics by choosing Exit comparison.</span><button type="button" onClick={() => { setBattleContext(null); setInput(""); }} className="shrink-0 rounded-lg border border-amber-300/40 px-3 py-2 font-bold">Exit comparison</button></div>}
          <form onSubmit={submit} className="border-t border-white/10 bg-[#0e1721] p-3">
            <label htmlFor="torque-dealership-scope" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Dealership inventory scope
            </label>
            <select
              id="torque-dealership-scope"
              value={dealershipId}
              onChange={(event) => { setDealershipId(event.target.value); setBattleContext(null); setInput(""); setTurns([{ role: "torque", text: "Dealership changed. Fresh search—tell me what you need at this store." }]); }}
              className="mb-3 w-full rounded-xl border border-white/15 bg-[#111b27] p-3 text-xs text-white"
            >
              <option value="orr-nissan-west">Orr Nissan West — Oklahoma City, OK</option>
              <option value="irving-hyundai-pending">Irving Hyundai — pending dealership confirmation (no live inventory)</option>
            </select>
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 focus-within:border-amber-300/30">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                maxLength={1200}
                placeholder="Compare Rogue vs Kicks for a family, or describe what you need…"
                className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600"
              />
              <button type="submit" disabled={busy || !input.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-black disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send to Torque">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="mt-2 px-1 text-[9px] leading-4 text-slate-600">Torque won’t invent availability, financing, transfer timing, or equipment that the verified source doesn’t support.</p>
          </form>
        </section>
      )}

      <LeadModal
        open={sourcingOpen}
        trigger="trapdoor"
        onClose={() => setSourcingOpen(false)}
        monthlyTarget={0}
        downPayment={0}
        termMonths={60}
        shortlistedVehicleIds={sourcingVehicleIds}
        context={sourcingContext}
        vehicleHuntRequest={sourcingRequest}
      />
    </>
  );
}
