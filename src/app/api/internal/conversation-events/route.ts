import { NextResponse } from "next/server";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { conversationEventSchema } from "@/lib/conversation-gateway";
import { persistConversationEvent } from "@/lib/conversation-gateway-persistence";
import { authorizeMachineServiceAssertion } from "@/lib/machine-service-auth";
import { consumeMachineAssertionNonce } from "@/lib/machine-service-replay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let gatewayPool: ReturnType<typeof createPostgresCrmPool> | undefined;

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

export async function POST(request: Request) {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) {
    return noStore({ message: "Conversation persistence dependency is not configured." }, 503);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return noStore({ message: "Invalid request body." }, 400);
  }

  const parsed = conversationEventSchema.safeParse(raw);
  if (!parsed.success) {
    return noStore({
      message: "Conversation event failed schema validation.",
      truthState: "REJECTED_INVALID_EVENT",
      authorityEffect: "NONE",
    }, 400);
  }

  const auth = authorizeMachineServiceAssertion({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET,
    expectedAudience: "CONVERSATION_GATEWAY",
    expectedWorkspaceId: parsed.data.workspaceId,
  });
  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") {
      return noStore({ message: "Conversation machine identity is not configured." }, 503);
    }
    return noStore({ message: "Unauthorized." }, 401);
  }

  gatewayPool ??= createPostgresCrmPool(connectionString);

  try {
    const replay = await consumeMachineAssertionNonce({ pool: gatewayPool, claims: auth.claims });
    if (!replay.consumed) {
      return noStore({
        message: "Machine assertion replay rejected.",
        truthState: "REJECTED_REPLAY",
        authorityEffect: "NONE",
      }, 409);
    }

    const result = await persistConversationEvent({ pool: gatewayPool, event: parsed.data });
    return noStore({
      protocol: "IGNIAQUA_CONVERSATION_INTAKE_RECEIPT_V1",
      truthState: "DURABLY_RECEIVED_ONLY",
      persistence: result.status,
      workspaceId: result.workspaceId,
      provider: result.provider,
      eventId: result.eventId,
      conversationId: result.conversationId,
      routingDecision: result.routingDecision,
      processingState: result.processingState,
      authorityEffect: "NONE",
    }, 202);
  } catch (error) {
    if (error instanceof Error && error.message.includes("CONVERSATION_EVENT_IDENTITY_COLLISION")) {
      return noStore({
        message: "Conversation event identity conflicts with previously received evidence.",
        truthState: "REJECTED_IDENTITY_COLLISION",
        authorityEffect: "NONE",
      }, 409);
    }
    return noStore({
      message: "Conversation event was not durably received.",
      truthState: "PERSISTENCE_FAILED",
      authorityEffect: "NONE",
    }, 503);
  }
}
