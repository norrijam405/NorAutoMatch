import { NextResponse } from "next/server";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";
import { readCommunicationHistory } from "@/lib/conversation-communication-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let pool: ReturnType<typeof createPostgresCrmPool> | undefined;

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

function getPool() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return null;
  pool ??= createPostgresCrmPool(connectionString);
  return pool;
}

export async function GET(request: Request) {
  const auth = await authorizeManagerRequest(request);
  if (!auth.authorized) {
    return noStore(
      { message: auth.reason === "NOT_CONFIGURED" ? "Manager identity verification is not configured." : "Unauthorized." },
      auth.reason === "NOT_CONFIGURED" ? 503 : 401,
    );
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider")?.trim() ?? "";
  const conversationId = url.searchParams.get("conversationId")?.trim() ?? "";
  if (!provider || provider.length > 120 || !conversationId || conversationId.length > 220) {
    return noStore({ message: "A bounded provider and conversationId are required." }, 400);
  }

  const crm = getPool();
  if (!crm) return noStore({ message: "Communication evidence persistence is not configured." }, 503);

  try {
    const history = await readCommunicationHistory({
      pool: crm,
      workspaceId: auth.claims.workspaceId,
      provider,
      conversationId,
    });
    return noStore(history, 200);
  } catch {
    return noStore({ message: "Communication history failed safely." }, 503);
  }
}
