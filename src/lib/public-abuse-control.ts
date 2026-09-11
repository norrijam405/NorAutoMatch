import { createHmac } from "node:crypto";

export const PUBLIC_LEAD_ABUSE_BUCKET = "public-lead-intake";
export const PUBLIC_LEAD_ABUSE_LIMIT = 5;
export const PUBLIC_LEAD_ABUSE_WINDOW_SECONDS = 10 * 60;

export type PublicAbuseCounterInput = {
  bucketKey: string;
  subjectHash: string;
  now: Date;
  windowSeconds: number;
};

export type PublicAbuseCounterResult = {
  count: number;
  resetAt: Date;
};

export interface PublicAbuseCounterStore {
  consume(input: PublicAbuseCounterInput): Promise<PublicAbuseCounterResult>;
}

export type PublicAbuseDecision = {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetAt: string;
};

function normalizeNetworkSubject(value: string) {
  return value.trim().slice(0, 128) || "unknown";
}

export function extractPublicNetworkSubject(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const realIp = request.headers.get("x-real-ip");
  return normalizeNetworkSubject(forwarded ?? realIp ?? "unknown");
}

export function hashPublicAbuseSubject(subject: string, secret: string) {
  const normalizedSecret = secret.trim();
  if (normalizedSecret.length < 32) {
    throw new Error("Public abuse HMAC secret must be at least 32 characters.");
  }

  return createHmac("sha256", normalizedSecret)
    .update(`norautomatch:public-abuse:v1:${normalizeNetworkSubject(subject)}`)
    .digest("hex");
}

export async function evaluatePublicAbuse(input: {
  store: PublicAbuseCounterStore;
  networkSubject: string;
  hmacSecret: string;
  now?: Date;
  bucketKey?: string;
  limit?: number;
  windowSeconds?: number;
}): Promise<PublicAbuseDecision> {
  const now = input.now ?? new Date();
  const bucketKey = input.bucketKey ?? PUBLIC_LEAD_ABUSE_BUCKET;
  const limit = input.limit ?? PUBLIC_LEAD_ABUSE_LIMIT;
  const windowSeconds = input.windowSeconds ?? PUBLIC_LEAD_ABUSE_WINDOW_SECONDS;

  if (!Number.isInteger(limit) || limit < 1) throw new Error("Public abuse limit must be a positive integer.");
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("Public abuse window must be a positive integer number of seconds.");
  }

  const subjectHash = hashPublicAbuseSubject(input.networkSubject, input.hmacSecret);
  const result = await input.store.consume({ bucketKey, subjectHash, now, windowSeconds });
  const remaining = Math.max(0, limit - result.count);

  return {
    allowed: result.count <= limit,
    count: result.count,
    limit,
    remaining,
    resetAt: result.resetAt.toISOString(),
  };
}

export class MemoryPublicAbuseCounterStore implements PublicAbuseCounterStore {
  private readonly buckets = new Map<string, { count: number; resetAt: Date }>();

  async consume(input: PublicAbuseCounterInput): Promise<PublicAbuseCounterResult> {
    const key = `${input.bucketKey}:${input.subjectHash}`;
    const current = this.buckets.get(key);

    if (!current || current.resetAt.getTime() <= input.now.getTime()) {
      const resetAt = new Date(input.now.getTime() + input.windowSeconds * 1000);
      this.buckets.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    const next = { count: current.count + 1, resetAt: current.resetAt };
    this.buckets.set(key, next);
    return next;
  }
}
