import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

function loginError(request: NextRequest, nextPath: string, message: string) {
  const login = new URL("/login", request.url);
  login.searchParams.set("error", message);
  login.searchParams.set("next", nextPath);
  return NextResponse.redirect(login);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = safeNext(request.nextUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error) return NextResponse.redirect(new URL(nextPath, request.url));

    return loginError(
      request,
      nextPath,
      "That confirmation link could not finish the sign-in session. Please resend a fresh confirmation email and use the newest link on this same device.",
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(nextPath, request.url));

    return loginError(
      request,
      nextPath,
      "That confirmation link is invalid or expired. Please resend a fresh confirmation email and use the newest link.",
    );
  }

  return loginError(
    request,
    nextPath,
    "That confirmation link is missing the information needed to finish signup. Please resend a fresh confirmation email and use the newest link.",
  );
}
