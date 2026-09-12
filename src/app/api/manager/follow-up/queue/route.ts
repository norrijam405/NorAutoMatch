import { NextResponse } from "next/server";
import { readFollowUpQueue } from "@/lib/crm-follow-up";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let followUpQueuePool: ReturnType<typeof createPostgresCrmPool> | undefined;

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

function parseLimit(request: Request) {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw) return 50;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 200)) : 50;
}

export async function GET(request: Request) {
  const auth = await authorizeManagerRequest(request);

  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") {
      return noStore({ message: "Manager identity verification is not configured." }, 503);
    }
    return noStore({ message: "Unauthorized." }, 401);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return noStore({ message: "Follow-up queue dependency is not configured." }, 503);
  followUpQueuePool ??= createPostgresCrmPool(connectionString);

  try {
    const items = await readFollowUpQueue({
      pool: followUpQueuePool,
      workspaceId: auth.claims.workspaceId,
      limit: parseLimit(request),
    });
    return noStore({
      protocol: "NORAUTO_FOLLOW_UP_QUEUE_RESPONSE_V1",
      truthState: "READ_MODEL_ONLY",
      authorityEffect: "NONE",
      items,
    }, 200);
  } catch {
    return noStore({ message: "Follow-up queue read failed safely." }, 503);
  }
}
