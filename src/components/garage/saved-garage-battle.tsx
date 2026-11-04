"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Vehicle } from "@/lib/inventory";
import { buildGarageBattleStory } from "@/lib/garage-battle";

type Props = { savedVehicles: Vehicle[]; unavailableCount: number };

const priorities = [
  { id: "all", label: "Show everything", signals: [] },
  { id: "budget", label: "Lower price", signals: ["advertised-price"] },
  { id: "fuel", label: "Fuel economy", signals: ["highway-mpg", "city-mpg"] },
  { id: "space", label: "More room", signals: ["cargo", "seating"] },
  { id: "weather", label: "Traction", signals: ["traction"] },
  { id: "city", label: "Easy parking", signals: ["footprint"] },
] as const;
type Priority = typeof priorities[number]["id"];


export function SavedGarageBattle({ savedVehicles, unavailableCount }: Props) {
  const [first, setFirst] = useState(savedVehicles[0]?.id ?? "");
  const [second, setSecond] = useState(savedVehicles[1]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("all");
  // Resolve selections against the current catalog so an old VIN cannot linger after an inventory refresh.
  const validFirst = savedVehicles.some(v => v.id === first) ? first : (savedVehicles[0]?.id ?? "");
  const validSecond = savedVehicles.some(v => v.id === second) && second !== validFirst
    ? second : (savedVehicles.find(v => v.id !== validFirst)?.id ?? "");
  const a = savedVehicles.find(vehicle => vehicle.id === validFirst);
  const b = savedVehicles.find(vehicle => vehicle.id === validSecond);
  const story = useMemo(() => a && b && a.id !== b.id ? buildGarageBattleStory(a,b) : null, [a,b]);
  const selectedPriority = priorities.find(p => p.id === priority) ?? priorities[0];
  const relevantSignals = story && priority !== "all"
    ? story.signals.filter(signal => (selectedPriority.signals as readonly string[]).includes(signal.id))
    : (story?.signals ?? []);
  const name = (v: Vehicle) => `${v.year} ${v.make} ${v.model} ${v.trim}`.trim();

  return <section id="garage-battle" aria-labelledby="garage-battle-heading" className="mt-8 rounded-3xl border border-amber-300/25 bg-amber-300/[.045] p-5 sm:p-7">
    <p className="text-xs font-black uppercase tracking-widest text-amber-300">Your saved cars · Head to head</p>
    <h2 id="garage-battle-heading" className="mt-2 text-2xl font-black text-white">Garage Battle</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Pick two vehicles from your Garage. Torque's battle breakdown uses dealer-listed facts and supported manufacturer specs, not invented promises or a universal winner.</p>
    {unavailableCount > 0 && <p role="status" className="mt-3 text-xs text-amber-200">{unavailableCount} saved vehicle{unavailableCount===1?" is":"s are"} missing from the currently verified catalog and cannot enter a battle yet. Your saved VINs remain intact.</p>}
    {savedVehicles.length < 2 ? <div className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-slate-300">
      Save at least two currently verified vehicles to start a battle. <Link href="/inventory" className="font-bold text-amber-300 underline">Browse inventory</Link>
    </div> : <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[{value:validFirst,set:setFirst,label:"Vehicle one",id:"battle-one"},{value:validSecond,set:setSecond,label:"Vehicle two",id:"battle-two"}].map(field=><div key={field.id}>
          <label htmlFor={field.id} className="mb-2 block text-xs font-bold text-slate-300">{field.label}</label>
          <select id={field.id} value={field.value} onChange={event=>field.set(event.target.value)} className="min-h-12 w-full rounded-xl border border-white/20 bg-[#101922] p-3 text-sm text-white">
            {savedVehicles.map(v=><option key={v.id} value={v.id}>{name(v)}</option>)}
          </select>
        </div>)}
      </div>
      {!story ? <p role="alert" className="mt-4 text-sm text-amber-200">Choose two different saved vehicles.</p> : <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[a!,b!].map(v=><div key={v.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-black text-white">{name(v)}</h3>
            <p className="mt-2 text-lg font-bold text-amber-300">${v.price.toLocaleString("en-US")}</p>
            <p className="mt-1 text-xs text-slate-400">{v.mileageVerified === false ? "Mileage not verified" : `${v.mileage.toLocaleString("en-US")} miles`} · {v.drivetrain || "Drivetrain unknown"}</p>
            <Link href={`/vehicles/${encodeURIComponent(v.id)}`} className="mt-3 inline-block text-xs font-bold text-amber-200 underline">Full vehicle details</Link>
          </div>)}
        </div>
        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-wider text-amber-300">What matters most to you?</p>
          <div role="group" aria-label="Choose your comparison priority" className="mt-3 flex flex-wrap gap-2">
            {priorities.map(option => <button key={option.id} type="button" aria-pressed={priority === option.id}
              onClick={() => setPriority(option.id)}
              className={`min-h-11 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${priority === option.id ? "border-amber-300 bg-amber-300 text-black" : "border-white/20 text-slate-300 hover:border-amber-300/60"}`}>
              {option.label}
            </button>)}
          </div>
        </div>
        <h3 className="mt-6 text-lg font-black text-white">{story.headline}</h3>
        {priority !== "all" && <p className="mt-2 text-sm text-slate-300">Showing evidence for <strong>{selectedPriority.label.toLowerCase()}</strong>. This is your selected priority, not a requirement inferred from saved cars.</p>}
        {relevantSignals.length ? <div className="mt-4 grid gap-3">
          {relevantSignals.map(signal=><article key={signal.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-black text-white">{signal.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{signal.text}</p>
            <p className="mt-2 text-xs text-slate-500">Evidence: {signal.evidence.map((e,i)=><span key={i}>{i>0?" · ":""}{e.url?<a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">{e.label}</a>:e.label}</span>)}</p>
          </article>)}
        </div> : <p className="mt-3 text-sm text-slate-400">No source-backed differentiators for this pair yet. Torque won't invent a winner.</p>}
        {story.evidenceGaps.length>0 && <details className="mt-4 rounded-xl border border-white/10 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-300">What's still unknown?</summary>
          {story.evidenceGaps.map((gap,i)=><p key={i} className="mt-2 text-xs leading-5 text-slate-400">{gap}</p>)}
        </details>}
        <div className="mt-5 rounded-2xl border border-amber-300/25 bg-black/20 p-4">
          <p className="text-sm font-black text-white">Want Torque's take?</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Ask Torque to review these exact saved VINs using source-backed differences. No invented features or substitute vehicles.</p>
          <button type="button" onClick={() => {
            if (!a || !b) return;
            const message = `Compare VIN ${a.id} and VIN ${b.id}. My priority is ${selectedPriority.label.toLowerCase()}. Explain verified tradeoffs only.`;
            window.dispatchEvent(new CustomEvent("norauto:ask-torque-battle", { detail: {
              vins: [a.id, b.id], priority, message
            }}));
          }} className="mt-3 min-h-11 rounded-xl bg-amber-300 px-5 py-2 text-sm font-black text-black hover:bg-amber-200">
            Ask Torque about these two cars
          </button>
        </div>
        <p className="mt-5 text-sm font-medium leading-6 text-amber-200">{story.decisionPrompt}</p>
        <p className="mt-2 text-xs text-slate-500">Pricing and availability may change; confirm details with the dealership. This is a factual comparison, not a live Torque AI conversation.</p>
      </>}
    </>}
  </section>;
}
