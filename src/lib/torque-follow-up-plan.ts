export type TorqueFollowUpChannel = "TEXT" | "EMAIL";

export type TorqueFollowUpReason =
  | "FIRST_CONTACT"
  | "NO_REPLY"
  | "EXACT_MATCH_FOUND"
  | "BETTER_MATCH_FOUND"
  | "PRICE_CHANGE"
  | "VEHICLE_STATUS_CHANGE"
  | "WATCHTOWER_NETWORK_MATCH"
  | "APPOINTMENT_REMINDER"
  | "POST_VISIT"
  | "CUSTOMER_REQUESTED_UPDATE";

export type TorqueFollowUpContext = {
  opportunityId: string;
  customerFirstName: string;
  consent: boolean;
  textAuthorized: boolean;
  emailAuthorized: boolean;
  suppressed: boolean;
  lastOutboundAt?: string;
  lastCustomerReplyAt?: string;
  exactMatchVin?: string;
  matchSummary?: string;
  watchtowerStore?: string;
  vehicleLabel?: string;
  price?: number;
};

export type TorqueFollowUpPlan = {
  allowed: boolean;
  primaryChannel?: TorqueFollowUpChannel;
  fallbackChannel?: TorqueFollowUpChannel;
  reason: TorqueFollowUpReason;
  urgency: "NOW" | "SOON" | "NORMAL";
  sendAuthority: "PREPARE_ONLY" | "AUTHORIZED_CHANNEL_REQUIRED";
  messageGoal: string;
  evidenceRequirements: string[];
  stopReasons: string[];
};

export function planTorqueFollowUp(
  reason: TorqueFollowUpReason,
  context: TorqueFollowUpContext,
): TorqueFollowUpPlan {
  const stopReasons: string[] = [];
  if (!context.consent) stopReasons.push("CONTACT_CONSENT_REQUIRED");
  if (context.suppressed) stopReasons.push("CUSTOMER_SUPPRESSED");
  if (!context.textAuthorized && !context.emailAuthorized) stopReasons.push("NO_AUTHORIZED_CHANNEL");

  if (stopReasons.length > 0) {
    return {
      allowed: false,
      reason,
      urgency: "NORMAL",
      sendAuthority: "PREPARE_ONLY",
      messageGoal: "Do not contact. Preserve the follow-up reason for human review.",
      evidenceRequirements: [],
      stopReasons,
    };
  }

  const primaryChannel: TorqueFollowUpChannel = context.textAuthorized ? "TEXT" : "EMAIL";
  const fallbackChannel: TorqueFollowUpChannel | undefined =
    primaryChannel === "TEXT" && context.emailAuthorized ? "EMAIL" : undefined;

  const inventoryEvent =
    reason === "EXACT_MATCH_FOUND" ||
    reason === "BETTER_MATCH_FOUND" ||
    reason === "PRICE_CHANGE" ||
    reason === "VEHICLE_STATUS_CHANGE" ||
    reason === "WATCHTOWER_NETWORK_MATCH";

  return {
    allowed: true,
    primaryChannel,
    fallbackChannel,
    reason,
    urgency:
      reason === "FIRST_CONTACT" || reason === "EXACT_MATCH_FOUND" || reason === "WATCHTOWER_NETWORK_MATCH"
        ? "NOW"
        : inventoryEvent
          ? "SOON"
          : "NORMAL",
    sendAuthority: "AUTHORIZED_CHANNEL_REQUIRED",
    messageGoal: messageGoal(reason, context),
    evidenceRequirements: evidenceFor(reason, context),
    stopReasons: [],
  };
}

function messageGoal(reason: TorqueFollowUpReason, context: TorqueFollowUpContext) {
  switch (reason) {
    case "FIRST_CONTACT":
      return "Introduce yourself quickly, acknowledge the exact vehicle need, and ask one useful next question.";
    case "NO_REPLY":
      return "Send one useful update or clarifying question. Never send a generic just-checking-in message.";
    case "EXACT_MATCH_FOUND":
      return "Tell the customer an exact requested match was found, identify the verified VIN/source, and invite the next step without promising a hold or transfer.";
    case "BETTER_MATCH_FOUND":
      return "Explain why the newly found vehicle is a better fit than prior options using explicit customer requirements or MatchDNA.";
    case "PRICE_CHANGE":
      return "Share the verified price change and the VIN it applies to without implying financing or out-the-door terms.";
    case "VEHICLE_STATUS_CHANGE":
      return "Share the verified inventory status change and clearly distinguish observed availability from reservation or transfer authority.";
    case "WATCHTOWER_NETWORK_MATCH":
      return "Tell the salesperson a strong network match was found at another store and prepare a manager-verification handoff before any customer promise.";
    case "APPOINTMENT_REMINDER":
      return "Remind the customer of the agreed appointment details only when the appointment is actually confirmed.";
    case "POST_VISIT":
      return "Follow up on the customer's stated needs and unresolved questions from the visit; do not manufacture satisfaction or intent.";
    case "CUSTOMER_REQUESTED_UPDATE":
      return "Answer the specific update the customer asked to receive using current verified evidence.";
  }
}

function evidenceFor(reason: TorqueFollowUpReason, context: TorqueFollowUpContext) {
  const refs: string[] = ["consent-state", "channel-authorization"];
  if (reason === "EXACT_MATCH_FOUND" || reason === "BETTER_MATCH_FOUND" || reason === "VEHICLE_STATUS_CHANGE") {
    refs.push("verified-inventory-observation");
    if (context.exactMatchVin) refs.push("vin:" + context.exactMatchVin);
  }
  if (reason === "PRICE_CHANGE") {
    refs.push("verified-price-observation");
    if (context.exactMatchVin) refs.push("vin:" + context.exactMatchVin);
  }
  if (reason === "WATCHTOWER_NETWORK_MATCH") {
    refs.push("watchtower-source-observation", "human-transfer-verification-required");
    if (context.watchtowerStore) refs.push("store:" + context.watchtowerStore);
  }
  if (reason === "BETTER_MATCH_FOUND" && context.matchSummary) refs.push("matchdna-or-explicit-preference-context");
  return refs;
}

export const torqueDefaultFollowUpCadence = {
  firstContactMinutes: 15,
  noReplyTextHours: 24,
  secondNoReplyHours: 72,
  longTailDays: 7,
  inventoryEventImmediate: true,
  preferredChannelOrder: ["TEXT", "EMAIL"] as const,
  rule: "Every follow-up must add new information, answer a customer request, or advance a clearly stated next step.",
};
