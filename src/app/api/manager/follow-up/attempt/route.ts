import { NextResponse } from "next/server";
import { executeFirstContactAttemptCommand } from "@/lib/crm-follow-up-command";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let followUpPool: ReturnType<typeof createPostgresCrmPool> | undefined;

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
  const auth = await authorizeManagerRequest(request);

  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") {
      return noStore({ message: "Manager identity verification is not configured." }, 503);
    }
    return noStore({ message: "Unauthorized." }, 401);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return noStore({ message: "Follow-up persistence dependency is not configured." }, 503);

  let body: Record<string, unknown> | null = null;
  try {
    body = asRecord(await request.json());
  } catch {
    return noStore({ message: "Invalid request body." }, 400);
  }

  const opportunityId = typeof body?.opportunityId === "string" ? body.opportunityId : "";
  const evidenceRef = typeof body?.evidenceRef === "string" ? body.evidenceRef : "";
  const observedAt = typeof body?.observedAt === "string" ? body.observedAt : "";

  if (!opportunityId || !evidenceRef || !observedAt) {
    return noStore({ message: "opportunityId, evidenceRef, and observedAt are required." }, 400);
  }

  followUpPool ??= createPostgresCrmPool(connectionString);

  try {
    const result = await executeFirstContactAttemptCommand({
      pool: followUpPool,
      workspaceId: auth.claims.workspaceId,
      opportunityId,
      evidenceRef,
      authority: "MANAGER",
      observedAt,
    });

    return noStore({
      protocol: "NORAUTO_FIRST_CONTACT_ATTEMPT_RESPONSE_V1",
      truthState: "EVIDENCE_BOUND_ATTEMPT",
      authorityEffect: result.authorityEffect,
      result,
    }, 200);
  } catch {
    return noStore({ message: "First-contact attempt was not applied." }, 409);
  }
}
