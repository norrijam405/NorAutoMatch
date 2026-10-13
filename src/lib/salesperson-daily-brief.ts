import type { WatchtowerOpportunityQueueItem } from "./watchtower-persistence";

export type SalespersonDailyBrief = {
  protocol: "NORAUTO_SALESPERSON_DAILY_BRIEF_V1";
  generatedAt: string;
  totalActionable: number;
  textNow: number;
  emailToday: number;
  managerReview: number;
  salespersonReview: number;
  watchOnly: number;
  topActions: Array<{
    huntId: string;
    action: WatchtowerOpportunityQueueItem["action"];
    score: number;
    headline: string;
    customerNeed: string;
    why: string[];
  }>;
  noActionClaim: "NO_COMMUNICATION_WAS_SENT_BY_THIS_BRIEF";
};

export function buildSalespersonDailyBrief(input: {
  items: WatchtowerOpportunityQueueItem[];
  generatedAt?: string;
  limit?: number;
}): SalespersonDailyBrief {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 25));
  const actionable = input.items.filter((item) => item.action !== "NO_ACTION");

  return {
    protocol: "NORAUTO_SALESPERSON_DAILY_BRIEF_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    totalActionable: actionable.length,
    textNow: actionable.filter((item) => item.action === "TEXT_CUSTOMER").length,
    emailToday: actionable.filter((item) => item.action === "EMAIL_CUSTOMER").length,
    managerReview: actionable.filter((item) => item.action === "MANAGER_REVIEW").length,
    salespersonReview: actionable.filter((item) => item.action === "SALESPERSON_REVIEW").length,
    watchOnly: actionable.filter((item) => item.action === "WATCH_ONLY").length,
    topActions: actionable.slice(0, limit).map((item) => ({
      huntId: item.huntId,
      action: item.action,
      score: item.score,
      headline: item.headline,
      customerNeed: item.explicitCustomerText,
      why: item.reasons,
    })),
    noActionClaim: "NO_COMMUNICATION_WAS_SENT_BY_THIS_BRIEF",
  };
}
