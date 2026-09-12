import { createHmac, timingSafeEqual } from "node:crypto";

export type MachineServiceAudience = "CONVERSATION_GATEWAY" | "CRM_RELAY";

export type MachineServiceAssertionClaims = {
  protocol: "NORAUTO_MACHINE_ASSERTION_V1";
  issuerService: string;
  audience: MachineServiceAudience;
  workspaceId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type MachineServiceAuthResult =
  | { authorized: true; claims: MachineServiceAssertionClaims }
  | {
      authorized: false;
      reason:
        | "NOT_CONFIGURED"
        | "MISSING_TOKEN"
        | "MALFORMED_TOKEN"
        | "INVALID_SIGNATURE"
        | "INVALID_CLAIMS"
        | "EXPIRED"
        | "WRONG_AUDIENCE"
        | "WRONG_WORKSPACE";
    };

const MAX_ASSERTION_LIFETIME_SECONDS = 5 * 60;
const CLOCK_SKEW_SECONDS = 30;

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function configuredSecret(secret: string | undefined) {
  const value = secret?.trim() ?? "";
  return value.length >= 32 ? value : undefined;
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest();
}

function secureSignatureMatch(supplied: Buffer, encodedPayload: string, secret: string) {
  const expected = sign(encodedPayload, secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function readBearer(header: string | null | undefined) {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || undefined;
}

function parseClaims(encodedPayload: string): MachineServiceAssertionClaims | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<MachineServiceAssertionClaims>;
    if (
      parsed.protocol !== "NORAUTO_MACHINE_ASSERTION_V1" ||
      (parsed.audience !== "CONVERSATION_GATEWAY" && parsed.audience !== "CRM_RELAY") ||
      typeof parsed.issuerService !== "string" || !parsed.issuerService.trim() || parsed.issuerService.length > 128 ||
      typeof parsed.workspaceId !== "string" || !parsed.workspaceId.trim() || parsed.workspaceId.length > 128 ||
      typeof parsed.issuedAt !== "number" || !Number.isInteger(parsed.issuedAt) ||
      typeof parsed.expiresAt !== "number" || !Number.isInteger(parsed.expiresAt) ||
      typeof parsed.nonce !== "string" || parsed.nonce.length < 16 || parsed.nonce.length > 256
    ) {
      return undefined;
    }
    if (parsed.expiresAt <= parsed.issuedAt || parsed.expiresAt - parsed.issuedAt > MAX_ASSERTION_LIFETIME_SECONDS) {
      return undefined;
    }
    return parsed as MachineServiceAssertionClaims;
  } catch {
    return undefined;
  }
}

export function authorizeMachineServiceAssertion(input: {
  authorizationHeader: string | null | undefined;
  configuredSecret: string | undefined;
  configuredPreviousSecret?: string | undefined;
  expectedAudience: MachineServiceAudience;
  expectedWorkspaceId: string;
  nowEpochSeconds?: number;
}): MachineServiceAuthResult {
  const secret = configuredSecret(input.configuredSecret);
  if (!secret) return { authorized: false, reason: "NOT_CONFIGURED" };

  const previousRaw = input.configuredPreviousSecret;
  const previousSecret = previousRaw?.trim() ? configuredSecret(previousRaw) : undefined;
  if (previousRaw?.trim() && !previousSecret) return { authorized: false, reason: "NOT_CONFIGURED" };
  if (previousSecret && previousSecret === secret) return { authorized: false, reason: "NOT_CONFIGURED" };

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

  const currentMatch = secureSignatureMatch(suppliedSignature, parts[0], secret);
  const previousMatch = previousSecret
    ? secureSignatureMatch(suppliedSignature, parts[0], previousSecret)
    : false;
  if (!currentMatch && !previousMatch) {
    return { authorized: false, reason: "INVALID_SIGNATURE" };
  }

  const claims = parseClaims(parts[0]);
  if (!claims) return { authorized: false, reason: "INVALID_CLAIMS" };
  if (claims.audience !== input.expectedAudience) return { authorized: false, reason: "WRONG_AUDIENCE" };

  const expectedWorkspaceId = input.expectedWorkspaceId.trim();
  if (!expectedWorkspaceId || claims.workspaceId !== expectedWorkspaceId) {
    return { authorized: false, reason: "WRONG_WORKSPACE" };
  }

  const now = input.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  if (claims.issuedAt > now + CLOCK_SKEW_SECONDS || claims.expiresAt <= now - CLOCK_SKEW_SECONDS) {
    return { authorized: false, reason: "EXPIRED" };
  }

  return { authorized: true, claims };
}

// Issuance belongs behind a trusted machine identity boundary. There is intentionally no public issuer route.
// New assertions are always signed with the current secret. The previous secret is verification-only during rollover.
export function createMachineServiceAssertionForTrustedIssuer(input: {
  claims: MachineServiceAssertionClaims;
  configuredSecret: string;
}) {
  const secret = configuredSecret(input.configuredSecret);
  if (!secret) throw new Error("Machine assertion signing secret must contain at least 32 characters.");
  const claims = parseClaims(b64url(JSON.stringify(input.claims)));
  if (!claims) throw new Error("Trusted issuer supplied invalid machine assertion claims.");
  const encodedPayload = b64url(JSON.stringify(claims));
  return `${encodedPayload}.${sign(encodedPayload, secret).toString("base64url")}`;
}
