"use client";

import { useActionState } from "react";
import { Loader2, Radar } from "lucide-react";
import { createFreshUpVehicleHunt, type FreshUpHuntActionState } from "@/app/manager/watchtower/actions";

const initialState: FreshUpHuntActionState = {
  ok: false,
  message: "",
};

export function FreshUpHuntForm({ persistenceReady = false }: { persistenceReady?: boolean }) {
  const [state, action, pending] = useActionState(createFreshUpVehicleHunt, initialState);

  return (
    <form action={action} className="rounded-[28px] border border-amber-300/20 bg-amber-300/[.035] p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-black"><Radar size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">Fresh Up</p>
          <h2 className="mt-2 text-3xl font-black text-white">Tell Torque what they want.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Use normal salesperson language. Torque will preserve the exact request and normalize the inventory details into a durable Vehicle Hunt.
          </p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Dealership workspace</span>
        <select name="dealershipId" required defaultValue="orr-nissan-west"
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#111b27] px-4 py-3 text-sm text-white">
          <option value="orr-nissan-west">Orr Nissan West — OKC (current)</option>
          <option value="irving-hyundai-pending" disabled>Irving Hyundai — pending verified workspace</option>
        </select>
        <span className="mt-1 block text-xs text-slate-500">Customer Hunts stay in the selected authorized dealership workspace. Unconnected dealerships cannot accept Hunts.</span>
      </label>

      <label className="mt-6 block">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Customer vehicle request</span>
        <textarea
          name="request"
          required
          minLength={4}
          maxLength={1200}
          rows={4}
          placeholder="Example: New 2026 Pathfinder, Baltic Teal, brown seats, 4WD. Platinum preferred. Wants to stay under $55k."
          className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <input name="consentToContact" type="checkbox" className="mt-1 size-4 accent-amber-300" />
        <span className="text-xs leading-5 text-slate-400">
          Customer has agreed to receive follow-up updates by an authorized channel. Leave this unchecked if that permission has not been established.
        </span>
      </label>

      {!persistenceReady && <p role="status" className="mt-4 text-xs leading-5 text-amber-200">Vehicle Hunt saving is disabled until the private Watchtower database connection is verified. No customer request will be silently lost.</p>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || !persistenceReady}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 size={17} className="animate-spin" /> : <Radar size={17} />}
          {pending ? "Saving Hunt…" : persistenceReady ? "Start Vehicle Hunt" : "Vehicle Hunt unavailable"}
        </button>
        {state.message && (
          <p className={state.ok ? "text-xs leading-5 text-emerald-300" : "text-xs leading-5 text-rose-300"}>
            {state.message}{state.huntId ? " · " + state.huntId : ""}
          </p>
        )}
      </div>
    </form>
  );
}
