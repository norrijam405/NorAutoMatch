import { redirect } from "next/navigation";
import { createClient } from "./server";

export type NorAutoRole = "member" | "operator" | "admin" | "founder";

export async function requireAuthenticatedUser(nextPath = "/") {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || !subject) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return { supabase, userId: subject };
}

export async function requireNorAutoMembership(
  allowedRoles: readonly NorAutoRole[],
  nextPath = "/manager",
) {
  const { supabase, userId } = await requireAuthenticatedUser(nextPath);
  const { data: membership, error } = await supabase
    .from("app_memberships")
    .select("role,active")
    .eq("user_id", userId)
    .eq("app_id", "norautomatch")
    .eq("active", true)
    .maybeSingle();

  if (error || !membership || !allowedRoles.includes(membership.role as NorAutoRole)) {
    redirect("/account?error=insufficient_access");
  }

  return { supabase, userId, role: membership.role as NorAutoRole };
}
