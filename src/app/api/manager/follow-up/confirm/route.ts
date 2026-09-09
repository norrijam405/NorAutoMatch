import { NextResponse } from "next/server";
import { executeContactConfirmationCommand } from "@/lib/crm-contact-confirmation-command";
import { NORAUTO_WORKSPACE_ID } from "@/lib/crm-persistence";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerSession } from "@/lib/manager-session-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let confirmationPool: ReturnType<typeof createPostgresCrmPool> | undefined;

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
    if (auth.reason === "NOT_CONFIGURED") {
      return noStore({ message: "Manager identity verification is not configured." }, 503);
    }
    return noStore({ message: "Unauthorized." }, 401);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return noStore({ message: "Contact confirmation dependency is not configured." }, 503);

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

  confirmationPool ??= createPostgresCrmPool(connectionString);

  try {
    const result = await executeContactConfirmationCommand({
      pool: confirmationPool,
      workspaceId: auth.claims.workspaceId,
      opportunityId,
      evidenceRef,
      authority: "MANAGER",
      observedAt,
    });
    return noStore({
      protocol: "NORAUTO_CONTACT_CONFIRMATION_RESPONSE_V1",
      truthState: "EVIDENCE_GATED_CONTACT_CONFIRMED",
      authorityEffect: result.authorityEffect,
      result,
    }, 200);
  } catch {
    return noStore({ message: "Contact confirmation was not applied." }, 409);
  }
}
