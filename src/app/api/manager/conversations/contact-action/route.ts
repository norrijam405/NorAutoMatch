import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";
import { recordCommunicationAction } from "@/lib/conversation-communication-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.string().trim().min(1).max(120),
  eventId: z.string().trim().min(1).max(200),
  channel: z.enum(["EMAIL","TEXT","PHONE"]),
  action: z.enum(["HANDOFF_OPENED","EXECUTION_RECORDED","DELIVERY_EVIDENCE_RECORDED"]),
  clientActionId: z.string().uuid(),
  evidenceRef: z.string().trim().min(1).max(512).optional(),
  deliveryOutcome: z.enum(["DELIVERED","FAILED"]).optional(),
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
  if (!body.ok) return noStore({ message: "Invalid communication action." }, body.reason === "TOO_LARGE" ? 413 : 400);
  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) return noStore({ message: "A bounded communication action is required." }, 400);

  const crm = getPool();
  if (!crm) return noStore({ message: "Communication evidence persistence is not configured." }, 503);

  try {
    const receipt = await recordCommunicationAction({
      pool: crm,
      workspaceId: auth.claims.workspaceId,
      actorSubjectId: auth.claims.subjectId,
      ...parsed.data,
    });
    return noStore(receipt, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("OWNERSHIP_REQUIRED")) return noStore({ message: "Claim this conversation before recording a human contact action." }, 409);
    if (message.includes("CONSENT_REQUIRED")) return noStore({ message: "Communication consent is not proven for this conversation." }, 409);
    if (message.includes("PREFERRED_CONTACT_MISMATCH")) return noStore({ message: "Use the customer's stated preferred contact channel." }, 409);
    if (message.includes("TARGET_MISSING")) return noStore({ message: "The preferred contact route is missing." }, 409);
    if (message.includes("PHONE_DELIVERY_RECEIPT_NOT_SUPPORTED")) return noStore({ message: "Phone-call delivery is not modeled as a provider delivery receipt." }, 409);
    if (message.includes("EVIDENCE_REF_REQUIRED") || message.includes("DELIVERY_OUTCOME_REQUIRED") || message.includes("DELIVERY_OUTCOME_NOT_ALLOWED")) {
      return noStore({ message: "The requested evidence fields do not match this communication action." }, 400);
    }
    if (message.includes("IDENTITY_COLLISION")) return noStore({ message: "That client action identifier is already bound to different evidence." }, 409);
    if (message.includes("NOT_ELIGIBLE") || message.includes("PROVENANCE_DRIFT")) return noStore({ message: "The source conversation evidence is not eligible." }, 409);
    return noStore({ message: "Communication evidence recording failed safely." }, 503);
  }
}
