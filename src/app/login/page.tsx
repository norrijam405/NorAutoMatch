import Link from "next/link";
import type { Metadata } from "next";
import { login, resendConfirmation, signup } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your NorAuto Match account.",
  robots: { index: false, follow: false, nocache: true },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; message?: string; mode?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account";
  const mode = params.mode === "signup" ? "signup" : "signin";
  const creatingAccount = mode === "signup";

  const signinHref = `/login?mode=signin&next=${encodeURIComponent(nextPath)}`;
  const signupHref = `/login?mode=signup&next=${encodeURIComponent(nextPath)}`;

  return (
    <section className="min-h-[72vh] border-b border-white/5 bg-slate-950/35 py-12 sm:py-16">
      <div className="shell max-w-xl">
        <p className="eyebrow">Secure account access</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white">
          {creatingAccount ? "Create your NorAuto Match account" : "Sign in to NorAuto Match"}
        </h1>
        <p className="mt-4 text-slate-400">
          {creatingAccount
            ? "Create one customer account to save vehicles and use your Garage. After signup, check your email and confirm the account before signing in."
            : "Use the same email and password you created for NorAuto Match. If you have not created an account yet, switch to Create account below."}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-2" aria-label="Account access mode">
          <Link href={signinHref} className={`rounded-xl px-4 py-3 text-center text-sm font-black transition ${!creatingAccount ? "bg-amber-300 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}>Sign in</Link>
          <Link href={signupHref} className={`rounded-xl px-4 py-3 text-center text-sm font-black transition ${creatingAccount ? "bg-amber-300 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}>Create account</Link>
        </div>

        {params.error ? <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-200">{params.error}</p> : null}
        {params.message ? <p className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200">{params.message}</p> : null}

        <form action={creatingAccount ? signup : login} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-slate-950/70 p-6">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block text-sm font-bold text-slate-200">
            Email
            <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-300/60" />
          </label>
          <label className="block text-sm font-bold text-slate-200">
            Password
            <input name="password" type="password" autoComplete={creatingAccount ? "new-password" : "current-password"} minLength={8} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-300/60" />
            {creatingAccount ? <span className="mt-2 block text-xs font-normal text-slate-500">Use at least 8 characters. You will use this same password after email confirmation.</span> : null}
          </label>
          <button type="submit" className="w-full rounded-xl bg-amber-300 px-5 py-3.5 font-black text-slate-950 hover:bg-amber-200">
            {creatingAccount ? "Create my account" : "Sign in"}
          </button>
        </form>

        {!creatingAccount ? (
          <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
            <summary className="cursor-pointer font-black text-white">Confirmation email not working?</summary>
            <p className="mt-3 leading-6 text-slate-400">If an older confirmation link opened <strong className="text-slate-200">localhost</strong>, enter the same signup email below and send yourself a fresh link.</p>
            <form action={resendConfirmation} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="next" value={nextPath} />
              <input name="email" type="email" autoComplete="email" required placeholder="Email used for signup" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-300/60" />
              <button type="submit" className="rounded-xl border border-amber-300/40 px-4 py-3 font-black text-amber-200 hover:bg-amber-300/10">Resend confirmation</button>
            </form>
          </details>
        ) : null}

        <p className="mt-5 text-center text-sm text-slate-500">
          {creatingAccount ? "Already created an account? " : "First time here? "}
          <Link href={creatingAccount ? signinHref : signupHref} className="font-black text-amber-300 hover:text-amber-200">
            {creatingAccount ? "Sign in instead" : "Create an account"}
          </Link>
        </p>

        <p className="mt-8 text-xs leading-5 text-slate-600">Customer signup never grants operator, manager, pricing, financing, or dealership authority. Staff access is assigned separately.</p>
      </div>
    </section>
  );
}
