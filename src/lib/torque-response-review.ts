/**
 * Candidate guard for generated sales drafts; textual heuristics are a review
 * trigger, NOT evidence certification and NOT a substitute for human approval.
 */
export type TorqueDraftReview = {
  state: "REVIEW_REQUIRED";
  flags: Array<"AVAILABILITY" | "PRICE" | "FINANCING" | "RESERVATION" | "APPOINTMENT" | "GUARANTEED_RESULT">;
  outboundExecution: "NOT_PERFORMED";
  customerReachedState: "NOT_CLAIMED";
};

export function reviewTorqueDraft(draft: string): TorqueDraftReview {
  const checks = [
    ["AVAILABILITY", /\b(?:in stock|available (?:now|today)|on (?:our |the )?lot|ready for pickup)\b/i],
    ["PRICE", /\b(?:out.the.door|final price|your price is|guaranteed price|\$\s*\d{2,})\b/i],
    ["FINANCING", /\b(?:approved|preapproved|guaranteed financing|\d+(?:\.\d+)?%\s*apr|\$\s*\d+\s*(?:per month|\/mo))\b/i],
    ["RESERVATION", /\b(?:reserved for you|put it on hold|vehicle is held)\b/i],
    ["APPOINTMENT", /\b(?:appointment (?:is |has been )?(?:booked|confirmed|scheduled)|see you (?:at|on) \d)\b/i],
    ["GUARANTEED_RESULT", /\b(?:i guarantee|we guarantee|you will definitely|get approved for sure)\b/i],
  ] as const;
  return {
    state: "REVIEW_REQUIRED",
    flags: checks.filter(([, pattern]) => pattern.test(draft)).map(([topic]) => topic),
    outboundExecution: "NOT_PERFORMED",
    customerReachedState: "NOT_CLAIMED",
  };
}
