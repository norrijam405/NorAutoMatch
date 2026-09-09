import { NextResponse } from "next/server";
import { runCrmOutboxRelayOnce } from "@/lib/crm-outbox-relay";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeRelayTrigger } from "@/lib/relay-trigger-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let relayPool: ReturnType<typeof createPostgresCrmPool> | undefined;

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function parseBatchSize(raw: string | undefined) {
  if (!raw) return 10;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(parsed, 50));
}

export async function POST(request: Request) {
  const auth = authorizeRelayTrigger({
    authorizationHeader: request.headers.get("authorization"),
    configuredToken: process.env.NORAUTO_RELAY_TRIGGER_TOKEN,
  });

  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") {
      return noStore({ message: "Relay trigger is not configured." }, 503);
    }
    return noStore({ message: "Unauthorized." }, 401);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  const targetUrl = process.env.CRM_WEBHOOK_URL?.trim();
  if (!connectionString || !targetUrl) {
    return noStore({ message: "Relay dependencies are not configured." }, 503);
  }

  relayPool ??= createPostgresCrmPool(connectionString);

  try {
    const outcomes = await runCrmOutboxRelayOnce({
      pool: relayPool,
      targetUrl,
      limit: parseBatchSize(process.env.NORAUTO_RELAY_BATCH_SIZE),
    });

    return noStore({
      processed: outcomes.length,
      delivered: outcomes.filter((outcome) => outcome.status === "DELIVERED").length,
      retryScheduled: outcomes.filter((outcome) => outcome.status === "RETRY_SCHEDULED").length,
      parked: outcomes.filter((outcome) => outcome.status === "PARKED").length,
    }, 200);
  } catch {
    return noStore({ message: "Relay execution failed safely." }, 503);
  }
}
