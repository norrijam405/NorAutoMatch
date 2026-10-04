import { createHash, timingSafeEqual } from "node:crypto";

export type RelayTriggerAuthResult =
  | { authorized: true }
  | { authorized: false; reason: "NOT_CONFIGURED" | "MISSING_BEARER" | "INVALID_BEARER" };

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authorizeRelayTrigger(input: {
  authorizationHeader: string | null;
  configuredToken: string | undefined;
}): RelayTriggerAuthResult {
  const configuredToken = input.configuredToken?.trim();
  if (!configuredToken || configuredToken.length < 32) {
    return { authorized: false, reason: "NOT_CONFIGURED" };
  }

  const match = input.authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  const suppliedToken = match?.[1]?.trim();
  if (!suppliedToken) {
    return { authorized: false, reason: "MISSING_BEARER" };
  }

  if (!timingSafeEqual(digest(configuredToken), digest(suppliedToken))) {
    return { authorized: false, reason: "INVALID_BEARER" };
  }

  return { authorized: true };
}
