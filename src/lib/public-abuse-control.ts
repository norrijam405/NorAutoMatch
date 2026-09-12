import { createHmac } from "node:crypto";

export const PUBLIC_LEAD_ABUSE_BUCKET = "public-lead-intake";
export const PUBLIC_LEAD_ABUSE_LIMIT = 5;
export const PUBLIC_LEAD_ABUSE_WINDOW_SECONDS = 10 * 60;
export const TRUSTED_PROXY_NETWORK_HEADERS_ACTIVATION = "TRUST_DEPLOYMENT_PROXY_NETWORK_HEADERS";

export type PublicNetworkSubjectHeader = "x-forwarded-for" | "x-real-ip";

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
  return value.trim().slice(0, 128);
}

function normalizeHmacSecret(secret: string, label: string) {
  const normalized = secret.trim();
  if (normalized.length < 32) throw new Error(`${label} must be at least 32 characters.`);
  return normalized;
}

export function parsePublicNetworkSubjectHeader(value: string | undefined | null): PublicNetworkSubjectHeader | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "x-forwarded-for" || normalized === "x-real-ip") return normalized;
  return null;
}

export function extractPublicNetworkSubject(
  request: Request,
  trustedHeader: PublicNetworkSubjectHeader,
): string | null {
  const raw = trustedHeader === "x-forwarded-for"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]
    : request.headers.get("x-real-ip");
  if (!raw) return null;
  const normalized = normalizeNetworkSubject(raw);
  return normalized || null;
}

export function hashPublicAbuseSubject(subject: string, secret: string) {
  const normalizedSubject = normalizeNetworkSubject(subject);
  if (!normalizedSubject) throw new Error("Public abuse network subject is required.");

  const normalizedSecret = normalizeHmacSecret(secret, "Public abuse HMAC secret");

  return createHmac("sha256", normalizedSecret)
    .update(`norautomatch:public-abuse:v1:${normalizedSubject}`)
    .digest("hex");
}

export async function evaluatePublicAbuse(input: {
  store: PublicAbuseCounterStore;
  networkSubject: string;
  hmacSecret: string;
  previousHmacSecret?: string;
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

  const currentSecret = normalizeHmacSecret(input.hmacSecret, "Public abuse HMAC secret");
  const previousRaw = input.previousHmacSecret?.trim() ?? "";
  const previousSecret = previousRaw
    ? normalizeHmacSecret(previousRaw, "Previous public abuse HMAC secret")
    : undefined;
  if (previousSecret && previousSecret === currentSecret) {
    throw new Error("Previous public abuse HMAC secret must differ from the current secret.");
  }

  const currentHash = hashPublicAbuseSubject(input.networkSubject, currentSecret);
  const current = await input.store.consume({ bucketKey, subjectHash: currentHash, now, windowSeconds });

  let effective = current;
  if (previousSecret) {
    const previousHash = hashPublicAbuseSubject(input.networkSubject, previousSecret);
    const previous = await input.store.consume({ bucketKey, subjectHash: previousHash, now, windowSeconds });
    if (
      previous.count > effective.count ||
      (previous.count === effective.count && previous.resetAt.getTime() > effective.resetAt.getTime())
    ) {
      effective = previous;
    }
  }

  const remaining = Math.max(0, limit - effective.count);

  return {
    allowed: effective.count <= limit,
    count: effective.count,
    limit,
    remaining,
    resetAt: effective.resetAt.toISOString(),
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
