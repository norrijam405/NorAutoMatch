import { createHmac, timingSafeEqual } from "node:crypto";
import type { ManagerActorEvidence } from "./manager-review-receipt";

export type ManagerSessionClaims = {
  protocol: "NORAUTO_MANAGER_SESSION_V1";
  subjectId: string;
  workspaceId: string;
  role: "MANAGER";
  verifier: string;
  evidenceRef: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type ManagerSessionAuthResult =
  | { authorized: true; claims: ManagerSessionClaims; actor: ManagerActorEvidence & { state: "VERIFIED" } }
  | {
      authorized: false;
      reason:
        | "NOT_CONFIGURED"
        | "MISSING_TOKEN"
        | "MALFORMED_TOKEN"
        | "INVALID_SIGNATURE"
        | "INVALID_CLAIMS"
        | "EXPIRED"
        | "WRONG_WORKSPACE"
        | "REVOKED";
    };

const MAX_SESSION_LIFETIME_SECONDS = 60 * 60;
const CLOCK_SKEW_SECONDS = 30;
const MAX_REVOKED_NONCES = 256;

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest();
}

function configuredSecret(secret: string | undefined) {
  const value = secret?.trim() ?? "";
  return value.length >= 32 ? value : undefined;
}

function readBearer(header: string | null | undefined) {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || undefined;
}

function parseClaims(encodedPayload: string): ManagerSessionClaims | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<ManagerSessionClaims>;
    if (
      parsed.protocol !== "NORAUTO_MANAGER_SESSION_V1" ||
      parsed.role !== "MANAGER" ||
      typeof parsed.subjectId !== "string" || !parsed.subjectId.trim() || parsed.subjectId.length > 256 ||
      typeof parsed.workspaceId !== "string" || !parsed.workspaceId.trim() || parsed.workspaceId.length > 128 ||
      typeof parsed.verifier !== "string" || !parsed.verifier.trim() || parsed.verifier.length > 256 ||
      typeof parsed.evidenceRef !== "string" || !parsed.evidenceRef.trim() || parsed.evidenceRef.length > 512 ||
      typeof parsed.issuedAt !== "number" || !Number.isInteger(parsed.issuedAt) ||
      typeof parsed.expiresAt !== "number" || !Number.isInteger(parsed.expiresAt) ||
      typeof parsed.nonce !== "string" || parsed.nonce.length < 16 || parsed.nonce.length > 256
    ) {
      return undefined;
    }
    if (parsed.expiresAt <= parsed.issuedAt || parsed.expiresAt - parsed.issuedAt > MAX_SESSION_LIFETIME_SECONDS) {
      return undefined;
    }
    return parsed as ManagerSessionClaims;
  } catch {
    return undefined;
  }
}

function secureSignatureMatch(supplied: Buffer, expected: Buffer) {
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function parseRevokedNonces(raw: string | undefined): Set<string> | undefined {
  const value = raw?.trim();
  if (!value) return new Set();

  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length > MAX_REVOKED_NONCES) return undefined;
  if (entries.some((entry) => entry.length < 16 || entry.length > 256)) return undefined;
  return new Set(entries);
}

export function authorizeManagerSession(input: {
  authorizationHeader: string | null | undefined;
  configuredSecret: string | undefined;
  configuredPreviousSecret?: string | undefined;
  revokedNonces?: string | undefined;
  expectedWorkspaceId: string;
  nowEpochSeconds?: number;
}): ManagerSessionAuthResult {
  const secret = configuredSecret(input.configuredSecret);
  if (!secret) return { authorized: false, reason: "NOT_CONFIGURED" };

  const previousRaw = input.configuredPreviousSecret ?? process.env.NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET;
  const previousSecret = previousRaw?.trim() ? configuredSecret(previousRaw) : undefined;
  if (previousRaw?.trim() && !previousSecret) return { authorized: false, reason: "NOT_CONFIGURED" };
  if (previousSecret && previousSecret === secret) return { authorized: false, reason: "NOT_CONFIGURED" };

  const revoked = parseRevokedNonces(input.revokedNonces ?? process.env.NORAUTO_MANAGER_REVOKED_SESSION_NONCES);
  if (!revoked) return { authorized: false, reason: "NOT_CONFIGURED" };

  const token = readBearer(input.authorizationHeader);
  if (!token) return { authorized: false, reason: "MISSING_TOKEN" };

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { authorized: false, reason: "MALFORMED_TOKEN" };

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(parts[1], "base64url");
  } catch {
    return { authorized: false, reason: "MALFORMED_TOKEN" };
  }

  const currentMatch = secureSignatureMatch(suppliedSignature, sign(parts[0], secret));
  const previousMatch = previousSecret
    ? secureSignatureMatch(suppliedSignature, sign(parts[0], previousSecret))
    : false;
  if (!currentMatch && !previousMatch) {
    return { authorized: false, reason: "INVALID_SIGNATURE" };
  }

  const claims = parseClaims(parts[0]);
  if (!claims) return { authorized: false, reason: "INVALID_CLAIMS" };

  const expectedWorkspaceId = input.expectedWorkspaceId.trim();
  if (!expectedWorkspaceId || claims.workspaceId !== expectedWorkspaceId) {
    return { authorized: false, reason: "WRONG_WORKSPACE" };
  }

  if (revoked.has(claims.nonce)) {
    return { authorized: false, reason: "REVOKED" };
  }

  const now = input.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  if (claims.issuedAt > now + CLOCK_SKEW_SECONDS || claims.expiresAt <= now - CLOCK_SKEW_SECONDS) {
    return { authorized: false, reason: "EXPIRED" };
  }

  return {
    authorized: true,
    claims,
    actor: {
      state: "VERIFIED",
      subjectId: claims.subjectId,
      verifier: claims.verifier,
      verifiedAt: new Date(claims.issuedAt * 1000).toISOString(),
      evidenceRef: claims.evidenceRef,
    },
  };
}

// Issuance belongs behind a trusted identity boundary. There is intentionally no public HTTP issuer route.
// New sessions are always signed with the current secret; the previous secret is verification-only during rollover.
export function createManagerSessionTokenForTrustedIssuer(input: {
  claims: ManagerSessionClaims;
  configuredSecret: string;
}) {
  const secret = configuredSecret(input.configuredSecret);
  if (!secret) throw new Error("Manager session signing secret must contain at least 32 characters.");
  const claims = parseClaims(b64url(JSON.stringify(input.claims)));
  if (!claims) throw new Error("Trusted issuer supplied invalid manager session claims.");
  const encodedPayload = b64url(JSON.stringify(claims));
  return `${encodedPayload}.${sign(encodedPayload, secret).toString("base64url")}`;
}
