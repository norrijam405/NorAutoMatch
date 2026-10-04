import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/supabase/authz";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const { supabase, userId } = await requireAuthenticatedUser("/account");
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("app_memberships").select("app_id,role,active").eq("user_id", userId),
  ]);

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell max-w-3xl">
        <p className="eyebrow">Protected account</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white">{profile?.display_name || "Your NorAuto Match account"}</h1>
        {params.error === "insufficient_access" ? <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">Your account is signed in, but it does not have the required operator role.</p> : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/garage" className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-white hover:border-amber-300/40">Open saved-vehicle garage →</Link>
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-slate-300">
            <p className="text-sm font-bold text-white">Access</p>
            <p className="mt-2 text-sm">{memberships?.length ? memberships.filter((m) => m.active).map((m) => `${m.app_id}: ${m.role}`).join(" · ") : "Customer account only"}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-8">
          <button className="rounded-xl border border-white/15 px-5 py-3 font-black text-white hover:border-white/30">Sign out</button>
        </form>
      </div>
    </section>
  );
}
