import { NextResponse } from "next/server";
import { NORAUTO_WORKSPACE_ID } from "@/lib/crm-persistence";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerSession } from "@/lib/manager-session-auth";
import { readResponsePreparationPacket } from "@/lib/conversation-response-preparation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let preparationPool: ReturnType<typeof createPostgresCrmPool> | undefined;

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const auth = authorizeManagerSession({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.NORAUTO_MANAGER_SESSION_SECRET,
    expectedWorkspaceId: NORAUTO_WORKSPACE_ID,
  });

  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") return noStore({ message: "Manager identity verification is not configured." }, 503);
    return noStore({ message: "Unauthorized." }, 401);
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider")?.trim();
  const eventId = url.searchParams.get("eventId")?.trim();
  if (!provider || !eventId || provider.length > 120 || eventId.length > 200) {
    return noStore({ message: "A bounded provider and eventId are required." }, 400);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return noStore({ message: "Response preparation dependency is not configured." }, 503);
  preparationPool ??= createPostgresCrmPool(connectionString);

  try {
    const packet = await readResponsePreparationPacket({
      pool: preparationPool,
      workspaceId: auth.claims.workspaceId,
      provider,
      eventId,
    });
    if (!packet) return noStore({ message: "Response preparation evidence was not found or is not eligible." }, 404);

    return noStore({
      protocol: "NORAUTO_MANAGER_RESPONSE_PREPARATION_V1",
      truthState: "DRAFT_PREPARATION_ONLY",
      authorityEffect: "NONE",
      packet,
    }, 200);
  } catch {
    return noStore({ message: "Response preparation failed safely." }, 503);
  }
}
