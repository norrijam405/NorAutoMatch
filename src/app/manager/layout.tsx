import type { ReactNode } from "react";
import { requireNorAutoMembership } from "@/lib/supabase/authz";

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  await requireNorAutoMembership(["operator", "admin", "founder"], "/manager");
  return children;
}
