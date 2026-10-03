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

function signupMessageForCode(code?: string) {
  switch (code) {
    case "signup_disabled":
      return "New account registration is currently unavailable. Please try again later.";
    case "email_address_invalid":
      return "That email address could not be accepted. Check it and try again.";
    case "weak_password":
      return "That password does not meet the account security requirements. Choose a stronger password and try again.";
    case "over_email_send_rate_limit":
    case "email_rate_limit_exceeded":
      return "Too many confirmation emails were requested recently. Wait a few minutes, then try again.";
    default:
      return "We could not create the account. The account service returned an error; please try again.";
  }
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

  try {
    const supabase = await createClient();
    const siteUrl = productionSiteUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
    });

    if (error) {
      const code = "code" in error ? error.code : undefined;
      const status = "status" in error ? error.status : undefined;
      console.error("NORAUTO_SIGNUP_ERROR", JSON.stringify({ code, status, message: error.message }));
      authError(signupMessageForCode(code), nextPath, "signup");
    }

    if (data.session) redirect(nextPath);

    redirect(`/login?mode=signin&message=${encodeURIComponent("Account request received. Check the inbox for the email you just used, open the NorAuto Match confirmation link, then return here and sign in with that same email and password.")}&next=${encodeURIComponent(nextPath)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("NORAUTO_SIGNUP_THROWN", JSON.stringify({ message }));
    authError("The account service could not complete the request. Please try again in a moment.", nextPath, "signup");
  }
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
