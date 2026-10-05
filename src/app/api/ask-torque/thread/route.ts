import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";
import { readSiteChatReplies } from "@/lib/site-chat-thread";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  accessToken: z.string().min(64).max(160).regex(/^[A-Za-z0-9_-]+$/),
});

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

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (!origin || origin !== requestOrigin) {
    return noStore({ message: "Cross-origin thread reads are not accepted." }, 403);
  }

  const body = await readJsonBodyWithByteLimit(request, 4096);
  if (!body.ok) return noStore({ message: "Invalid thread request." }, body.reason === "TOO_LARGE" ? 413 : 400);

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) return noStore({ message: "Invalid thread access." }, 400);

  const crm = getPool();
  if (!crm) return noStore({ message: "Ask Torque thread persistence is not configured." }, 503);

  try {
    const replies = await readSiteChatReplies({
      pool: crm,
      workspaceId: "norautomatch",
      conversationId: `site-${parsed.data.conversationId}`,
      accessToken: parsed.data.accessToken,
    });

    return noStore({
      protocol: "NORAUTO_SITE_CHAT_THREAD_V1",
      replies,
      externalDelivery: "NOT_PERFORMED",
      authorityEffect: "NONE",
    }, 200);
  } catch {
    return noStore({ message: "Thread read failed safely." }, 503);
  }
}
