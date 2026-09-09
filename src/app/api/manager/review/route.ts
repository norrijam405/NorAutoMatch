import { NextResponse } from "next/server";
import { executeManagerReviewCommand } from "@/lib/crm-manager-review-command";
import { authorizeManagerSession } from "@/lib/manager-session-auth";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { NORAUTO_WORKSPACE_ID } from "@/lib/crm-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let managerReviewPool: ReturnType<typeof createPostgresCrmPool> | undefined;

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

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("INVALID_BODY");
  const body = value as Record<string, unknown>;
  const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId.trim() : "";
  const expectedHandoffId = typeof body.expectedHandoffId === "string" ? body.expectedHandoffId.trim() : "";
  const decision = body.decision;
  const note = typeof body.note === "string" ? body.note.trim() : undefined;

  if (!/^namo_[0-9a-f]{24}$/.test(opportunityId)) throw new Error("INVALID_BODY");
  if (!/^namh_[0-9a-f]{24}$/.test(expectedHandoffId)) throw new Error("INVALID_BODY");
  if (decision !== "ACKNOWLEDGED" && decision !== "RETURNED_FOR_CLARIFICATION") throw new Error("INVALID_BODY");
  if (note && note.length > 2000) throw new Error("INVALID_BODY");

  return { opportunityId, expectedHandoffId, decision, note } as const;
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
  if (!connectionString) return noStore({ message: "Manager review dependency is not configured." }, 503);

  let body: ReturnType<typeof parseBody>;
  try {
    body = parseBody(await request.json());
  } catch {
    return noStore({ message: "Invalid manager review request." }, 400);
  }

  managerReviewPool ??= createPostgresCrmPool(connectionString);

  try {
    const result = await executeManagerReviewCommand({
      pool: managerReviewPool,
      workspaceId: auth.claims.workspaceId,
      opportunityId: body.opportunityId,
      expectedHandoffId: body.expectedHandoffId,
      decision: body.decision,
      actor: auth.actor,
      note: body.note,
    });

    if (result.status === "REJECTED") {
      return noStore({
        status: result.status,
        reason: result.reason,
        authorityEffect: result.authorityEffect,
      }, 403);
    }

    return noStore({
      status: result.status,
      opportunityId: result.opportunityId,
      receiptId: result.receiptId,
      deskState: result.deskState,
      authorityEffect: result.authorityEffect,
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("stale or unrelated handoff") ||
      message.includes("manager-review-pending") ||
      message.includes("terminal CRM opportunity")
    ) {
      return noStore({ message: "Manager review state changed; refresh the queue before retrying." }, 409);
    }
    return noStore({ message: "Manager review failed safely." }, 503);
  }
}
