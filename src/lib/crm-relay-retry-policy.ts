export type CrmRelayRetryDecision =
  | { state: "RETRY_SCHEDULED"; delayMs: number }
  | { state: "PARKED"; delayMs: null };

export function crmRelayRetryDelayMs(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error("CRM relay attempt must be a positive integer.");
  }
  const base = 5_000;
  const cappedExponent = Math.min(attempt - 1, 8);
  return Math.min(base * 2 ** cappedExponent, 15 * 60_000);
}

export function decideCrmRelayRetry(input: {
  attempt: number;
  maxAttempts: number;
}): CrmRelayRetryDecision {
  if (!Number.isInteger(input.attempt) || input.attempt < 1) {
    throw new Error("CRM relay attempt must be a positive integer.");
  }
  if (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1) {
    throw new Error("CRM relay maxAttempts must be a positive integer.");
  }
  if (input.attempt >= input.maxAttempts) {
    return { state: "PARKED", delayMs: null };
  }
  return { state: "RETRY_SCHEDULED", delayMs: crmRelayRetryDelayMs(input.attempt) };
}
