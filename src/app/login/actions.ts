"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value.trim() : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/account";
}

function authError(message: string, nextPath: string) {
  redirect(`/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNext(formData.get("next"));

  if (!email || !password) authError("Email and password are required.", nextPath);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authError("Sign-in failed. Check your credentials and try again.", nextPath);

  redirect(nextPath);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNext(formData.get("next"));

  if (!email || password.length < 8) {
    authError("Use a valid email and a password with at least 8 characters.", nextPath);
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });

  if (error) authError("Account creation failed. Please try again.", nextPath);
  if (data.session) redirect(nextPath);
  redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}&next=${encodeURIComponent(nextPath)}`);
}
