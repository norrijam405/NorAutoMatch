"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value.trim() : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/account";
}

function authError(message: string, nextPath: string, mode: "signin" | "signup" = "signin") {
  redirect(`/login?mode=${mode}&error=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`);
}

function productionSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNext(formData.get("next"));

  if (!email || !password) authError("Enter both your email and password.", nextPath, "signin");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = "code" in error ? error.code : undefined;
    if (code === "email_not_confirmed") {
      authError("This account still needs email confirmation. Use Resend confirmation below if the old link sent you to localhost.", nextPath, "signin");
    }
    authError("That email and password did not sign in. If this is your first visit, choose Create account instead.", nextPath, "signin");
  }

  redirect(nextPath);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNext(formData.get("next"));

  if (!email || password.length < 8) {
    authError("Enter a valid email and choose a password with at least 8 characters.", nextPath, "signup");
  }

  const supabase = await createClient();
  const siteUrl = productionSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });

  if (error) authError("We could not create the account. Check the email/password and try again.", nextPath, "signup");
  if (data.session) redirect(nextPath);

  redirect(`/login?mode=signin&message=${encodeURIComponent("Account request received. Check the inbox for the email you just used, open the NorAuto Match confirmation link, then return here and sign in with that same email and password.")}&next=${encodeURIComponent(nextPath)}`);
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = safeNext(formData.get("next"));

  if (!email) authError("Enter the email address you used to create the account.", nextPath, "signin");

  const supabase = await createClient();
  const siteUrl = productionSiteUrl();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });

  if (error) {
    authError("We could not resend the confirmation email yet. Wait a moment and try again with the same email address.", nextPath, "signin");
  }

  redirect(`/login?mode=signin&message=${encodeURIComponent("Fresh confirmation email sent. Use the newest NorAuto Match email; older confirmation links may still point to the old localhost address.")}&next=${encodeURIComponent(nextPath)}`);
}
