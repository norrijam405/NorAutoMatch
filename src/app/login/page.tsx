import type { Metadata } from "next";
import { login, signup } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your NorAuto Match account.",
  robots: { index: false, follow: false, nocache: true },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account";

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-16 sm:py-20">
      <div className="shell max-w-xl">
        <p className="eyebrow">Secure account access</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white">Sign in to NorAuto Match</h1>
        <p className="mt-4 text-slate-400">Your account session is handled by Supabase Auth. Operator access is granted separately and cannot be self-assigned.</p>

        {params.error ? <p className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{params.error}</p> : null}
        {params.message ? <p className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{params.message}</p> : null}

        <form className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-slate-950/70 p-6">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block text-sm font-bold text-slate-200">
            Email
            <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-300/60" />
          </label>
          <label className="block text-sm font-bold text-slate-200">
            Password
            <input name="password" type="password" autoComplete="current-password" minLength={8} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-300/60" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button formAction={login} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950 hover:bg-amber-200">Sign in</button>
            <button formAction={signup} className="rounded-xl border border-white/15 px-5 py-3 font-black text-white hover:border-white/30">Create account</button>
          </div>
        </form>
      </div>
    </section>
  );
}
