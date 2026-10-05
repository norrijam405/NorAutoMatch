import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/supabase/authz";
import { buildCustomerDealPrepSummary } from "@/lib/customer-deal-prep";

export const metadata: Metadata = {
  title: "Deal Prep Center",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DealPrepCenterPage() {
  const { supabase, userId } = await requireAuthenticatedUser("/account/deal-prep");

  const [{ data: profile }, { data: saved }, { data: documents }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("saved_vehicles").select("vin,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("customer_secure_documents")
      .select("id,kind,status,opportunity_id,raw_deleted_at,received_at")
      .eq("user_id", userId)
      .order("received_at", { ascending: false }),
  ]);

  const summary = buildCustomerDealPrepSummary({
    savedVehicleCount: saved?.length ?? 0,
    documents: (documents ?? []).map((doc) => ({
      kind: doc.kind,
      status: doc.status,
      opportunityId: doc.opportunity_id,
      rawDeletedAt: doc.raw_deleted_at,
    })),
  });

  const linkedOpportunity = (documents ?? []).find((doc) => doc.opportunity_id)?.opportunity_id ?? null;

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-14 sm:py-18">
      <div className="shell max-w-5xl">
        <p className="eyebrow">Protected customer workspace</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">
              {profile?.display_name ? profile.display_name + "'s deal prep" : "Deal Prep Center"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              One place for your saved vehicles and secure deal documents before the sales desk reviews anything.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-black uppercase tracking-[.14em] text-slate-300">
            {summary.workspaceState === "DESK_LINKED"
              ? "Desk packet linked"
              : summary.workspaceState === "BUILDING_PACKET"
                ? "Building your packet"
                : "Getting started"}
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Saved vehicles" value={summary.savedVehicleCount} />
          <Stat label="Active documents" value={summary.documentCount} />
          <Stat label="Ready documents" value={summary.readyDocumentCount} />
          <Stat label="Needs attention" value={summary.unresolvedDocumentCount} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-300">1 · Pick the vehicle</p>
            <h2 className="mt-2 text-xl font-black text-white">Your Garage</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Keep the vehicles you are serious about in one place so your shopping history and Market Scout work stay tied to the VIN.
            </p>
            <Link href="/garage" className="mt-5 inline-block text-sm font-black text-amber-300 hover:text-amber-200">
              Open Garage →
            </Link>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-300">2 · Send what the desk needs</p>
            <h2 className="mt-2 text-xl font-black text-white">Secure documents</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Trade offers, insurance, license, payoff statements, and other deal documents stay in private storage rather than normal chat.
            </p>
            <Link href="/account/documents" className="mt-5 inline-block text-sm font-black text-emerald-300 hover:text-emerald-200">
              Open secure documents →
            </Link>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-sky-300">3 · Desk review</p>
            <h2 className="mt-2 text-xl font-black text-white">
              {linkedOpportunity ? "Packet connected" : "Waiting for desk link"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {linkedOpportunity
                ? "At least one secure document is linked to a NorAutoMatch desk-prep opportunity."
                : "Your saved vehicles and documents can be prepared now. A desk opportunity appears here only after the dealership links it."}
            </p>
            {linkedOpportunity ? (
              <code className="mt-5 block break-all rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
                {linkedOpportunity}
              </code>
            ) : null}
          </section>
        </div>

        <div className="mt-8 rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-5 sm:p-6">
          <p className="text-sm font-black text-white">What Torque can and cannot see</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Torque can use status signals such as “insurance received” or “trade offer received.” He does not receive the raw license, insurance image, storage path, or document contents from this workspace.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Lender submission: NOT PERFORMED · Financing approval: NOT CLAIMED · Final deal authority stays with dealership management.
          </p>
        </div>

        <Link href="/account" className="mt-8 inline-block text-sm font-black text-amber-300 hover:text-amber-200">← Back to account</Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
