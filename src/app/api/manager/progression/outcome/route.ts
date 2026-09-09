import { NextResponse } from "next/server";
import { NORAUTO_WORKSPACE_ID } from "@/lib/crm-persistence";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { executeOutcomeCommand } from "@/lib/crm-sales-progression-command";
import { authorizeManagerSession } from "@/lib/manager-session-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let outcomePool: ReturnType<typeof createPostgresCrmPool> | undefined;

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function POST(request: Request) {
  const auth = authorizeManagerSession({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.NORAUTO_MANAGER_SESSION_SECRET,
    expectedWorkspaceId: NORAUTO_WORKSPACE_ID,
  });
  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") return noStore({ message: "Manager identity verification is not configured." }, 503);
    return noStore({ message: "Unauthorized." }, 401);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return noStore({ message: "Outcome progression dependency is not configured." }, 503);

  let body: Record<string, unknown> | null = null;
  try { body = asRecord(await request.json()); } catch { return noStore({ message: "Invalid request body." }, 400); }
  const opportunityId = typeof body?.opportunityId === "string" ? body.opportunityId : "";
  const evidenceRef = typeof body?.evidenceRef === "string" ? body.evidenceRef : "";
  const observedAt = typeof body?.observedAt === "string" ? body.observedAt : "";
  const outcome = body?.outcome === "SOLD" || body?.outcome === "LOST" ? body.outcome : null;
  if (!opportunityId || !evidenceRef || !observedAt || !outcome) {
    return noStore({ message: "opportunityId, outcome, evidenceRef, and observedAt are required." }, 400);
  }

  outcomePool ??= createPostgresCrmPool(connectionString);
  try {
    const result = await executeOutcomeCommand({
      pool: outcomePool,
      workspaceId: auth.claims.workspaceId,
      opportunityId,
      outcome,
      evidenceRef,
      authority: "MANAGER",
      observedAt,
    });
    return noStore({
      protocol: "NORAUTO_TERMINAL_OUTCOME_RESPONSE_V1",
      truthState: "EVIDENCE_GATED_TERMINAL_OUTCOME",
      authorityEffect: result.authorityEffect,
      result,
    }, 200);
  } catch {
    return noStore({ message: "Terminal outcome was not applied." }, 409);
  }
}
