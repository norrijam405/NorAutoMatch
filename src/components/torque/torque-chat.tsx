"use client";

import Link from "next/link";
import { Bot, ChevronDown, ExternalLink, Loader2, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { LeadModal } from "@/components/matcher/lead-modal";

type Match = {
  id: string;
  label: string;
  price: number;
  mileage: number;
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
};

type Turn = {
  role: "user" | "torque";
  text: string;
  response?: TorqueResponse;
};

export function TorqueChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourcingOpen, setSourcingOpen] = useState(false);
  const [sourcingRequest, setSourcingRequest] = useState("");
  const [sourcingContext, setSourcingContext] = useState("");
  const [sourcingVehicleIds, setSourcingVehicleIds] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "torque",
      text: "Tell me what you're actually looking for. Give me the details that matter and I’ll tell you what fits, what doesn’t, and where the compromises are.",
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

    setTurns((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/torque/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = (await response.json().catch(() => ({}))) as TorqueResponse;
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
            <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white" aria-label="Close Torque"><X size={18} /></button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {turns.map((turn, index) => (
              <div key={index} className={turn.role === "user" ? "ml-8" : "mr-4"}>
                <div className={turn.role === "user"
                  ? "rounded-2xl rounded-br-md bg-white/[.07] px-4 py-3 text-sm leading-6 text-slate-100"
                  : "rounded-2xl rounded-bl-md border border-amber-300/10 bg-amber-300/[.04] px-4 py-3 text-sm leading-6 text-slate-200"}>
                  {turn.text}
                </div>

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
                          <p className="mt-1 text-[11px] text-slate-500">{match.mileage.toLocaleString()} mi · {match.drivetrain} · {match.type}</p>
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

          <form onSubmit={submit} className="border-t border-white/10 bg-[#0e1721] p-3">
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
                placeholder="Example: Baltic Teal Pathfinder, brown seats, 4WD…"
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
