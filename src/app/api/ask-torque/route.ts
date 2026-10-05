import { NextResponse } from "next/server";
import { buildAskTorqueConversationEvent, askTorqueInputSchema } from "@/lib/ask-torque-intake";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { persistConversationEvent } from "@/lib/conversation-gateway-persistence";
import {
  MemoryPublicAbuseCounterStore,
  evaluatePublicAbuse,
  extractPublicNetworkSubject,
  parsePublicNetworkSubjectHeader,
  TRUSTED_PROXY_NETWORK_HEADERS_ACTIVATION,
  type PublicNetworkSubjectHeader,
} from "@/lib/public-abuse-control";
import { PostgresPublicAbuseCounterStore } from "@/lib/public-abuse-postgres";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";
import { registerSiteChatAccess } from "@/lib/site-chat-thread";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 12 * 1024;
const CHAT_ABUSE_BUCKET = "public-site-chat";
const CHAT_ABUSE_LIMIT = 12;
const CHAT_ABUSE_WINDOW_SECONDS = 10 * 60;
const DEVELOPMENT_ABUSE_HMAC_SECRET = "development-only-norautomatch-public-abuse-v1";

const localStore = new MemoryPublicAbuseCounterStore();
let crmPool: ReturnType<typeof createPostgresCrmPool> | undefined;
let postgresStore: PostgresPublicAbuseCounterStore | undefined;

function noStore(body: Record<string, unknown>, status: number, headers?: Record<string,string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function getPool() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return null;
  crmPool ??= createPostgresCrmPool(connectionString);
  return crmPool;
}

function getGuard(): {
  store: MemoryPublicAbuseCounterStore | PostgresPublicAbuseCounterStore;
  hmacSecret: string;
  previousHmacSecret?: string;
  networkHeader: PublicNetworkSubjectHeader;
} | null {
  if (process.env.NODE_ENV !== "production") {
    return {
      store: localStore,
      hmacSecret: DEVELOPMENT_ABUSE_HMAC_SECRET,
      networkHeader: "x-forwarded-for",
    };
  }

  if (process.env.NORAUTO_TRUST_PROXY_NETWORK_HEADERS?.trim() !== TRUSTED_PROXY_NETWORK_HEADERS_ACTIVATION) {
    return null;
  }

  const networkHeader = parsePublicNetworkSubjectHeader(process.env.NORAUTO_PUBLIC_NETWORK_SUBJECT_HEADER);
  const hmacSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET?.trim();
  const previousHmacSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET?.trim();
  const pool = getPool();

  if (!pool || !networkHeader || !hmacSecret || hmacSecret.length < 32) return null;
  if (previousHmacSecret && (previousHmacSecret.length < 32 || previousHmacSecret === hmacSecret)) return null;

  postgresStore ??= new PostgresPublicAbuseCounterStore(pool);
  return {
    store: postgresStore,
    hmacSecret,
    previousHmacSecret: previousHmacSecret || undefined,
    networkHeader,
  };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (!origin || origin !== requestOrigin) {
    return noStore({ message: "Cross-origin chat requests are not accepted." }, 403);
  }

  const guard = getGuard();
  if (!guard) {
    return noStore({ message: "Ask Torque is not activated on this server yet." }, 503);
  }

  const subject = extractPublicNetworkSubject(request, guard.networkHeader);
  if (!subject) {
    return noStore({ message: "Ask Torque could not verify this request path." }, 503);
  }

  try {
    const abuse = await evaluatePublicAbuse({
      store: guard.store,
      networkSubject: subject,
      hmacSecret: guard.hmacSecret,
      previousHmacSecret: guard.previousHmacSecret,
      bucketKey: CHAT_ABUSE_BUCKET,
      limit: CHAT_ABUSE_LIMIT,
      windowSeconds: CHAT_ABUSE_WINDOW_SECONDS,
    });
    if (!abuse.allowed) {
      const retryAfter = Math.max(1, Math.ceil((Date.parse(abuse.resetAt) - Date.now()) / 1000));
      return noStore({ message: "Too many chat messages. Please try again shortly." }, 429, { "Retry-After": String(retryAfter) });
    }
  } catch {
    return noStore({ message: "Ask Torque protection is temporarily unavailable." }, 503);
  }

  const body = await readJsonBodyWithByteLimit(request, MAX_REQUEST_BYTES);
  if (!body.ok) {
    return noStore(
      { message: body.reason === "TOO_LARGE" ? "Chat request is too large." : "Invalid chat request." },
      body.reason === "TOO_LARGE" ? 413 : 400,
    );
  }

  const parsed = askTorqueInputSchema.safeParse(body.value);
  if (!parsed.success) {
    return noStore({ message: "Please check the message and contact information." }, 400);
  }

  const pool = getPool();
  if (!pool) {
    return noStore({ message: "Ask Torque persistence is not configured." }, 503);
  }

  try {
    const event = buildAskTorqueConversationEvent(parsed.data, new Date().toISOString());
    const result = await persistConversationEvent({ pool, event });
    const threadAccess = await registerSiteChatAccess({
      pool,
      workspaceId: event.workspaceId,
      conversationId: event.conversationId,
      accessToken: parsed.data.accessToken,
    });
    return noStore({
      accepted: true,
      protocol: "NORAUTO_ASK_TORQUE_RECEIPT_V1",
      conversationId: result.conversationId,
      eventId: result.eventId,
      persistence: result.status,
      routingDecision: result.routingDecision,
      siteThreadAccess: threadAccess.status,
      siteThreadExpiresAt: threadAccess.expiresAt,
      responseExecution: "NOT_PERFORMED",
      customerReachedState: "NOT_CLAIMED",
      authorityEffect: "NONE",
    }, 202);
  } catch (error) {
    if (error instanceof Error && error.message.includes("CONVERSATION_EVENT_IDENTITY_COLLISION")) {
      return noStore({ message: "That message identifier conflicts with earlier evidence." }, 409);
    }
    return noStore({ message: "Your message could not be saved safely. Please try again." }, 503);
  }
}
