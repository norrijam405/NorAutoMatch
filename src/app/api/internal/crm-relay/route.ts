import { NextResponse } from "next/server";
import { emitDueFollowUpEvents } from "@/lib/crm-follow-up-due";
import { runCrmOutboxRelayOnce } from "@/lib/crm-outbox-relay";
import { NORAUTO_WORKSPACE_ID } from "@/lib/crm-persistence";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeMachineServiceAssertion } from "@/lib/machine-service-auth";
import { consumeMachineAssertionNonce } from "@/lib/machine-service-replay";

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
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  const targetUrl = process.env.CRM_WEBHOOK_URL?.trim();
  if (!connectionString || !targetUrl) {
    return noStore({ message: "Relay dependencies are not configured." }, 503);
  }

  const auth = authorizeMachineServiceAssertion({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.NORAUTO_RELAY_ASSERTION_SECRET,
    configuredPreviousSecret: process.env.NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET,
    expectedAudience: "CRM_RELAY",
    expectedWorkspaceId: NORAUTO_WORKSPACE_ID,
  });

  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") {
      return noStore({ message: "Relay machine identity is not configured." }, 503);
    }
    return noStore({ message: "Unauthorized." }, 401);
  }

  relayPool ??= createPostgresCrmPool(connectionString);

  try {
    const replay = await consumeMachineAssertionNonce({ pool: relayPool, claims: auth.claims });
    if (!replay.consumed) {
      return noStore({
        message: "Machine assertion replay rejected.",
        truthState: "REJECTED_REPLAY",
        authorityEffect: "NONE",
      }, 409);
    }

    const dueEvents = await emitDueFollowUpEvents({
      pool: relayPool,
      workspaceId: NORAUTO_WORKSPACE_ID,
      limit: parseBatchSize(process.env.NORAUTO_RELAY_BATCH_SIZE),
    });

    const outcomes = await runCrmOutboxRelayOnce({
      pool: relayPool,
      targetUrl,
      limit: parseBatchSize(process.env.NORAUTO_RELAY_BATCH_SIZE),
    });

    return noStore({
      dueScan: {
        considered: dueEvents.length,
        emitted: dueEvents.filter((event) => event.status === "EMITTED").length,
        deduplicated: dueEvents.filter((event) => event.status === "DEDUPLICATED").length,
        authorityEffect: "NONE",
      },
      processed: outcomes.length,
      delivered: outcomes.filter((outcome) => outcome.status === "DELIVERED").length,
      retryScheduled: outcomes.filter((outcome) => outcome.status === "RETRY_SCHEDULED").length,
      parked: outcomes.filter((outcome) => outcome.status === "PARKED").length,
    }, 200);
  } catch {
    return noStore({ message: "Relay execution failed safely." }, 503);
  }
}
