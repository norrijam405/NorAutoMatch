"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Bot, ChevronDown, ExternalLink, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { answerTorqueDemo } from "@/lib/torque-demo";
import { brand } from "@/lib/brand";
import type { Vehicle } from "@/lib/inventory";
import { formatMoney } from "@/lib/inventory";

type Message = {
  id: number;
  role: "torque" | "user";
  text: string;
  vehicles?: Vehicle[];
  handoffRecommended?: boolean;
};

const starters = [
  "SUV around $30k",
  "$500/month",
  "Compare Rogue vs RAV4",
  "I want tech and reliability",
];

export function TorqueChatbox() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [counter, setCounter] = useState(2);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "torque",
      text: "I’m Torque. Give me your number, body style, or must-haves and I’ll help narrow the field. I won’t invent live availability, financing approval, or deal terms.",
    },
  ]);

  const latestVehicleIds = useMemo(
    () => [...messages].reverse().find((message) => message.vehicles?.length)?.vehicles?.map((vehicle) => vehicle.id) ?? [],
    [messages],
  );

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    const result = answerTorqueDemo(value);
    const userId = counter;
    const torqueId = counter + 1;
    setCounter(counter + 2);
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: value },
      {
        id: torqueId,
        role: "torque",
        text: result.text,
        vehicles: result.vehicles,
        handoffRecommended: result.handoffRecommended,
      },
    ]);
    setInput("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-50 inline-flex min-h-14 items-center gap-3 rounded-full border border-amber-300/30 bg-[#0a1018] px-5 text-sm font-black text-white shadow-[0_20px_70px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-[#101925] ${open ? "pointer-events-none opacity-0" : "opacity-100"}`}
        aria-label="Open Torque car shopping assistant"
      >
        <span className="relative grid size-9 place-items-center rounded-full bg-amber-300 text-black">
          <Bot size={19} />
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#0a1018] bg-emerald-400" />
        </span>
        <span className="text-left leading-tight">
          <span className="block">Ask Torque</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[.12em] text-white/45">Car-shopping copilot</span>
        </span>
      </button>

      {open && (
        <section
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[82vh] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#080d14] shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[420px]"
          aria-label="Torque chat"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-[#0c131d] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-300 text-black"><Bot size={21} /></span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-white">Torque</h2>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] text-emerald-300">Preview</span>
                </div>
                <p className="text-[11px] text-slate-500">Session-only shopping assistant</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close Torque chat"><X size={18} /></button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[88%] ${message.role === "user" ? "rounded-2xl rounded-br-md bg-amber-300 px-4 py-3 text-sm font-semibold leading-6 text-black" : ""}`}>
                    {message.role === "torque" && (
                      <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[.045] px-4 py-3 text-sm leading-6 text-slate-200">
                        {message.text}
                      </div>
                    )}
                    {message.role === "user" && message.text}

                    {message.vehicles && message.vehicles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="rounded-xl border border-white/10 bg-[#0d151f] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-white">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">{vehicle.trim} · {vehicle.type} · {vehicle.drivetrain}</p>
                              </div>
                              <p className="text-xs font-black text-amber-300">{formatMoney(vehicle.price)}</p>
                            </div>
                          </div>
                        ))}
                        <Link href="/inventory" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-300/30 px-3 text-xs font-black text-amber-200 hover:bg-amber-300/10">
                          Open inventory <ExternalLink size={12} />
                        </Link>
                      </div>
                    )}

                    {message.handoffRecommended && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <a href={brand.textHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-300 px-3 text-xs font-black text-black">
                          <MessageCircle size={14} /> Text sales
                        </a>
                        <a href={`tel:${brand.phoneRaw}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 px-3 text-xs font-black text-white">
                          Call
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {messages.length === 1 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/35"><Sparkles size={12} /> Try one</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((starter) => (
                    <button key={starter} type="button" onClick={() => send(starter)} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-slate-300 hover:border-amber-300/30 hover:text-white">
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {latestVehicleIds.length > 0 && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[10px] leading-4 text-slate-500">
                Torque is showing representative demo matches here. Current VIN availability must come from the verified inventory path.
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-white/10 bg-[#0b121b] p-3">
            <div className="flex items-end gap-2">
              <label className="flex min-h-12 flex-1 items-center rounded-2xl border border-white/10 bg-black/25 px-3 focus-within:border-amber-300/40">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Budget, SUV, Rogue vs RAV4..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
                  maxLength={500}
                  aria-label="Message Torque"
                />
                {input && <button type="button" onClick={() => setInput("")} className="grid size-7 place-items-center text-slate-600 hover:text-white" aria-label="Clear message"><ChevronDown className="rotate-90" size={15} /></button>}
              </label>
              <button type="submit" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-300 text-black disabled:opacity-40" disabled={!input.trim()} aria-label="Send message to Torque"><Send size={18} /></button>
            </div>
            <p className="mt-2 px-1 text-[9px] leading-4 text-slate-600">Torque Preview does not store this chat or make dealership/lender commitments.</p>
          </form>
        </section>
      )}
    </>
  );
}
