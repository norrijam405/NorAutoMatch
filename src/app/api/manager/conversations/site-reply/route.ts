import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";
import { publishSiteChatReply } from "@/lib/site-chat-thread";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.literal("NORAUTO_SITE_CHAT"),
  eventId: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(3000),
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
  const auth = await authorizeManagerRequest(request);
  if (!auth.authorized) {
    return noStore(
      { message: auth.reason === "NOT_CONFIGURED" ? "Manager identity verification is not configured." : "Unauthorized." },
      auth.reason === "NOT_CONFIGURED" ? 503 : 401,
    );
  }

  const body = await readJsonBodyWithByteLimit(request, 8192);
  if (!body.ok) return noStore({ message: "Invalid reply request." }, body.reason === "TOO_LARGE" ? 413 : 400);
  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) return noStore({ message: "A bounded same-site reply is required." }, 400);

  const crm = getPool();
  if (!crm) return noStore({ message: "Site-thread persistence is not configured." }, 503);

  try {
    const receipt = await publishSiteChatReply({
      pool: crm,
      workspaceId: auth.claims.workspaceId,
      provider: parsed.data.provider,
      eventId: parsed.data.eventId,
      body: parsed.data.body,
      publishedBy: auth.claims.subjectId,
    });
    return noStore(receipt, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("CURRENT_OWNER_REQUIRED")) {
      return noStore({ message: "Claim this conversation before publishing a website reply." }, 409);
    }
    if (message.includes("NOT_ELIGIBLE") || message.includes("NOT_ACTIVE")) {
      return noStore({ message: "This conversation is not eligible for same-site reply delivery." }, 409);
    }
    return noStore({ message: "Reply publish failed safely." }, 503);
  }
}
