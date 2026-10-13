import type { Metadata } from "next";
import Link from "next/link";
import { Binoculars, Bot, CarFront, Radar, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { torqueInventorySources } from "@/lib/torque-inventory-sources";
import { FreshUpHuntForm } from "@/components/manager/fresh-up-hunt-form";
import { refreshVehicleHunt } from "@/app/manager/watchtower/actions";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { readActiveVehicleHunts, readWatchtowerOpportunityQueue } from "@/lib/watchtower-persistence";
import { buildSalespersonDailyBrief } from "@/lib/salesperson-daily-brief";
import { prepareTorqueHuntFollowUp } from "@/lib/torque-follow-up-draft";
import { chooseTorqueNextBestAction } from "@/lib/torque-next-best-action";
import { industryScoutSources } from "@/lib/industry-scout";

export const metadata: Metadata = {
  title: "Torque Watchtower",
  description: "Restricted NorAuto Match sourcing and inventory intelligence surface.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TorqueWatchtowerPage() {
  await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/watchtower");

  let activeHunts: Awaited<ReturnType<typeof readActiveVehicleHunts>> = [];
  let opportunityQueue: Awaited<ReturnType<typeof readWatchtowerOpportunityQueue>> = [];
  let huntReadState: "READY" | "NOT_CONFIGURED" | "MIGRATION_PENDING" = "READY";
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) {
    huntReadState = "NOT_CONFIGURED";
  } else {
    try {
      const pool = createPostgresCrmPool(connectionString);
      activeHunts = await readActiveVehicleHunts({ pool, workspaceId: "norautomatch", limit: 30 });
      opportunityQueue = await readWatchtowerOpportunityQueue({ pool, workspaceId: "norautomatch", limit: 30 });
      await pool.end();
    } catch {
      huntReadState = "MIGRATION_PENDING";
    }
  }

  const dailyBrief = buildSalespersonDailyBrief({ items: opportunityQueue, limit: 8 });

  const local = torqueInventorySources.filter((source) => source.scope === "LOCAL_STORE");
  const network = torqueInventorySources.filter((source) => source.scope === "ORR_GROUP" || source.scope === "ORR_NISSAN_SIBLING");
  const national = torqueInventorySources.filter((source) => source.scope === "NISSAN_NATIONAL");

  return (
    <main className="min-h-screen bg-[#070b10] py-10 sm:py-14">
      <div className="shell">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-400">Restricted operator surface</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-.06em] text-white sm:text-7xl">TORQUE<br />WATCHTOWER</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Vehicle Hunt intelligence for fresh ups, active customers, sourcing opportunities, MatchDNA, and follow-up. Customer-facing Torque stays simple; this side keeps the operational detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/manager/follow-up" className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white">Follow-up desk</Link>
            <Link href="/inventory" className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-black">Verified inventory</Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={<CarFront size={20} />} title="Our inventory" value={String(local.length)} detail="Primary verified customer-facing scope." />
          <SummaryCard icon={<Radar size={20} />} title="Orr sourcing layers" value={String(network.length)} detail="Group and sibling Nissan discovery sources." />
          <SummaryCard icon={<Binoculars size={20} />} title="National Nissan layers" value={String(national.length)} detail="New-Nissan discovery and dealer resolution." />
        </section>

        <section className="mt-10">
          <FreshUpHuntForm />
        </section>

        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-red-400">Active Vehicle Hunts</p>
              <h2 className="mt-2 text-3xl font-black text-white">What Torque is hunting right now.</h2>
            </div>
            <p className="text-xs text-slate-500">{huntReadState === "READY" ? activeHunts.length + " active" : huntReadState === "NOT_CONFIGURED" ? "Database not configured" : "Migration not active yet"}</p>
          </div>

          {huntReadState !== "READY" ? (
            <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-4 text-sm leading-6 text-amber-100/70">
              Watchtower Hunt persistence is coded but not active in this runtime yet. No fake Hunt data is being shown.
            </div>
          ) : activeHunts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-500">
              No active Hunts yet. Use Fresh Up above to create the first one.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {activeHunts.map((hunt) => {
                const nextAction = chooseTorqueNextBestAction({
                  hunt: {
                    huntId: hunt.huntId,
                    state: hunt.state,
                    consentToContact: hunt.consentToContact,
                    candidateVins: hunt.candidateVins,
                    truth: hunt.truth,
                  },
                });
                const draft = hunt.consentToContact
                  ? prepareTorqueHuntFollowUp({
                      hunt: {
                        huntId: hunt.huntId,
                        state: hunt.state,
                        requirements: hunt.requirements,
                        candidateVins: hunt.candidateVins,
                        consentToContact: hunt.consentToContact,
                      },
                      channel: "TEXT",
                    })
                  : null;
                return (
                <article key={hunt.huntId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-amber-300">{hunt.state.replaceAll("_", " ")}</span>
                        <span className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">{hunt.origin.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-3 text-sm font-black text-white">{hunt.explicitCustomerText}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{hunt.candidateCount} candidate VIN{hunt.candidateCount === 1 ? "" : "s"} · {hunt.consentToContact ? "follow-up consent on file" : "no follow-up consent"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={nextAction.priority === "HIGH"
                          ? "rounded-full border border-red-300/20 bg-red-300/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-red-200"
                          : nextAction.priority === "MEDIUM"
                            ? "rounded-full border border-amber-300/20 bg-amber-300/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-amber-200"
                            : "rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-slate-400"}>
                          {nextAction.priority} priority
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[.12em] text-emerald-300">
                          Next: {nextAction.action.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <code className="text-[10px] text-slate-600">{hunt.huntId}</code>
                      <form action={refreshVehicleHunt}>
                        <input type="hidden" name="huntId" value={hunt.huntId} />
                        <button type="submit" className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-emerald-300 hover:bg-emerald-300/[.1]">
                          Refresh verified inventory
                        </button>
                      </form>
                    </div>
                  </div>
                  {draft && (
                    <div className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-300/[.035] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[.14em] text-blue-200">Prepared text</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-black text-slate-500">{draft.status.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-300">{draft.body}</p>
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-black"><Bot size={21} /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">Fresh Up mode</p>
                <h2 className="mt-2 text-3xl font-black text-white">Tell Torque once.</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Capture the exact vehicle request, mark must-haves versus preferences, search the available inventory layers, and preserve the result as one Vehicle Hunt instead of retyping the customer need in multiple systems.
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Example Hunt</p>
              <p className="mt-3 text-lg font-black text-white">2026 Pathfinder · Baltic Teal · Chestnut · 4WD</p>
              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <p>✓ Explicit customer spec retained</p>
                <p>✓ Local → Orr → national search order</p>
                <p>✓ MatchDNA can enrich, not override</p>
                <p>✓ Human verification before sourcing promise</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
            <div className="flex items-center gap-2 text-emerald-300"><ShieldCheck size={18} /><span className="text-xs font-black uppercase tracking-[.16em]">Truth boundary</span></div>
            <h2 className="mt-4 text-3xl font-black text-white">Internal detail. Cleaner customer language.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Watchtower may show the exact store, VIN, source timestamp, fit reasons, compromises, and verification state. Customer-facing Torque focuses on whether we can help obtain the right vehicle without pretending a transfer, reservation, financing result, or arrival time is already confirmed.
            </p>
            <div className="mt-6 space-y-3 text-xs leading-5 text-slate-500">
              <p>OBSERVED → a source currently reports the VIN.</p>
              <p>VERIFIED → the governed source check supports the claim.</p>
              <p>HUMAN VERIFY → manager or salesperson action is still required.</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">Connected search registry</p><h2 className="mt-2 text-3xl font-black text-white">Inventory intelligence layers</h2></div>
            <span className="hidden text-xs text-slate-600 sm:inline">Discovery does not equal transfer authority.</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {torqueInventorySources.map((source) => (
              <article key={source.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">{source.scope.replaceAll("_", " ")}</p><h3 className="mt-1 font-black text-white">{source.label}</h3></div>
                  <span className={source.enabled ? "rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-300" : "rounded-full bg-white/5 px-2 py-1 text-[9px] font-black text-slate-500"}>{source.enabled ? "REGISTERED" : "OFF"}</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">{source.conditionPolicy.replaceAll("_", " ")} · {source.makePolicy.replaceAll("_", " ")} · {source.customerAuthority.replaceAll("_", " ")}</p>
              </article>
            ))}
          </div>
        </section>


        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">Industry Scout</p>
              <h2 className="mt-2 text-3xl font-black text-white">What changed that matters to the floor?</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Incentives, launches, trim changes, competitive moves, supply, pricing, sales, demand, EV/hybrid shifts, and safety changes are tracked with source authority attached. Customer-safe Torque claims require primary or corroborated evidence.
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-300">
              {industryScoutSources.filter((source) => source.enabled).length} governed sources
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {industryScoutSources.map((source) => (
              <article key={source.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">{source.sourceClass.replaceAll("_", " ")}</p>
                    <h3 className="mt-1 text-sm font-black text-white">{source.label}</h3>
                  </div>
                  <span className="text-xs font-black text-emerald-300">{source.authorityWeight}</span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">{source.topics.slice(0, 5).map((topic) => topic.replaceAll("_", " ")).join(" · ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-300 text-black"><TrendingUp size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">Salesperson Daily Brief</p>
              <h2 className="mt-2 text-3xl font-black text-white">Who deserves attention today?</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Watchtower turns verified Scout changes and active Vehicle Hunts into a prioritized action queue. This brief recommends work; it does not claim any message was sent.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <BriefMetric label="Text now" value={dailyBrief.textNow} />
                <BriefMetric label="Email today" value={dailyBrief.emailToday} />
                <BriefMetric label="Manager review" value={dailyBrief.managerReview} />
                <BriefMetric label="Sales review" value={dailyBrief.salespersonReview} />
                <BriefMetric label="Watch only" value={dailyBrief.watchOnly} />
              </div>

              {huntReadState !== "READY" ? (
                <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-4 text-sm leading-6 text-amber-100/70">
                  The Watchtower action queue is not active in this runtime yet. No fake opportunities are being shown.
                </div>
              ) : dailyBrief.topActions.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-500">
                  No evidence-backed Scout opportunities currently require action.
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {dailyBrief.topActions.map((item) => (
                    <article key={item.huntId + item.headline} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-emerald-300">{item.action.replaceAll("_", " ")}</span>
                            <span className="text-[10px] font-black text-amber-300">Score {item.score}</span>
                          </div>
                          <p className="mt-3 text-sm font-black text-white">{item.headline}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{item.customerNeed}</p>
                          {item.why.length > 0 && <p className="mt-2 text-[11px] leading-5 text-slate-600">{item.why.join(" · ")}</p>}
                        </div>
                        <code className="shrink-0 text-[10px] text-slate-600">{item.huntId}</code>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-red-500/20 bg-red-500/[.035] p-6 sm:p-8">
          <div className="flex items-start gap-3"><Sparkles size={20} className="mt-1 text-red-300" /><div><h2 className="text-2xl font-black text-white">Next activation</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Persist Vehicle Hunts, connect Watchtower observations to those Hunts, then expose CRM adapters one provider at a time only after each provider contract and authorization path is verified.</p></div></div>
        </section>
      </div>
    </main>
  );
}

function BriefMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>;
}

function SummaryCard({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="text-amber-300">{icon}</div><p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-slate-600">{title}</p><p className="mt-1 text-4xl font-black text-white">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></article>;
}
