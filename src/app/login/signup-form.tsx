"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (!email || password.length < 8) {
      setStatus({ kind: "error", text: "Enter a valid email and choose a password with at least 8 characters." });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });

      if (error) {
        setStatus({
          kind: "error",
          text: error.message || "We could not create the account. Check the email/password and try again.",
        });
        return;
      }

      if (data.session) {
        window.location.assign(nextPath);
        return;
      }

      const message = encodeURIComponent(
        "Account request received. Check the inbox for the email you just used, open the NorAuto Match confirmation link, then return here and sign in with that same email and password.",
      );
      window.location.assign(`/login?mode=signin&message=${message}&next=${encodeURIComponent(nextPath)}`);
    } catch {
      setStatus({
        kind: "error",
        text: "The account request could not reach the sign-up service. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-slate-950/70 p-6">
      <label className="block text-sm font-bold text-slate-200">
        Email
        <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-300/60" />
      </label>
      <label className="block text-sm font-bold text-slate-200">
        Password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-300/60" />
        <span className="mt-2 block text-xs font-normal text-slate-500">Use at least 8 characters. You will use this same password after email confirmation.</span>
      </label>

      {status ? (
        <p
          role="alert"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm leading-6 ${status.kind === "error" ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}
        >
          {status.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-amber-300 px-5 py-3.5 font-black text-slate-950 hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create my account"}
      </button>
    </form>
  );
}
