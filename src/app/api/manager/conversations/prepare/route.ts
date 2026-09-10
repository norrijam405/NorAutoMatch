import { NextResponse } from "next/server";
import { NORAUTO_WORKSPACE_ID } from "@/lib/crm-persistence";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { authorizeManagerSession } from "@/lib/manager-session-auth";
import { createResponseDraft } from "@/lib/conversation-response-draft";
import { createEnrichedResponseDraft } from "@/lib/conversation-response-enrichment";
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

function authorize(request: Request) {
  return authorizeManagerSession({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.NORAUTO_MANAGER_SESSION_SECRET,
    expectedWorkspaceId: NORAUTO_WORKSPACE_ID,
  });
}

function readLookup(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider")?.trim();
  const eventId = url.searchParams.get("eventId")?.trim();
  if (!provider || !eventId || provider.length > 120 || eventId.length > 200) return null;
  return { provider, eventId };
}

function getPool() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return null;
  preparationPool ??= createPostgresCrmPool(connectionString);
  return preparationPool;
}

export async function GET(request: Request) {
  const auth = authorize(request);
  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") return noStore({ message: "Manager identity verification is not configured." }, 503);
    return noStore({ message: "Unauthorized." }, 401);
  }

  const lookup = readLookup(request);
  if (!lookup) return noStore({ message: "A bounded provider and eventId are required." }, 400);

  const pool = getPool();
  if (!pool) return noStore({ message: "Response preparation dependency is not configured." }, 503);

  try {
    const packet = await readResponsePreparationPacket({
      pool,
      workspaceId: auth.claims.workspaceId,
      provider: lookup.provider,
      eventId: lookup.eventId,
    });
    if (!packet) return noStore({ message: "Response preparation evidence was not found or is not eligible." }, 404);

    const draft = createResponseDraft(packet);
    return noStore({
      protocol: "NORAUTO_MANAGER_RESPONSE_PREPARATION_V2",
      truthState: "DRAFT_ONLY",
      authorityEffect: "NONE",
      packet,
      draft,
    }, 200);
  } catch {
    return noStore({ message: "Response preparation failed safely." }, 503);
  }
}

export async function POST(request: Request) {
  const auth = authorize(request);
  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") return noStore({ message: "Manager identity verification is not configured." }, 503);
    return noStore({ message: "Unauthorized." }, 401);
  }

  const lookup = readLookup(request);
  if (!lookup) return noStore({ message: "A bounded provider and eventId are required." }, 400);

  const pool = getPool();
  if (!pool) return noStore({ message: "Response preparation dependency is not configured." }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore({ message: "Valid JSON is required." }, 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return noStore({ message: "A bounded evidence body is required." }, 400);
  }
  const claims = (body as { claims?: unknown }).claims;
  if (!Array.isArray(claims) || claims.length > 12) {
    return noStore({ message: "claims must be an array of at most 12 evidence records." }, 400);
  }

  try {
    const packet = await readResponsePreparationPacket({
      pool,
      workspaceId: auth.claims.workspaceId,
      provider: lookup.provider,
      eventId: lookup.eventId,
    });
    if (!packet) return noStore({ message: "Response preparation evidence was not found or is not eligible." }, 404);

    const draft = createEnrichedResponseDraft({ packet, claims });
    return noStore({
      protocol: "NORAUTO_MANAGER_RESPONSE_PREPARATION_V3",
      truthState: "DRAFT_WITH_EVIDENCE_ONLY",
      authorityEffect: "NONE",
      packet,
      draft,
    }, 200);
  } catch {
    return noStore({ message: "Response evidence enrichment failed safely." }, 503);
  }
}
