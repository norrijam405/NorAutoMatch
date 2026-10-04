import { createHash } from "node:crypto";
import type { CrmOpportunity } from "./crm-core";

export type RetentionSignalType =
  | "FOLLOW_UP_STALLED"
  | "COMMITMENT_DUE"
  | "COMMITMENT_OVERDUE"
  | "APPOINTMENT_NO_SHOW_CANDIDATE"
  | "POST_VISIT_FOLLOW_UP_DUE"
  | "POST_SALE_CHECK_IN_DUE"
  | "SERVICE_INTRODUCTION_DUE"
  | "LEASE_OR_TRADE_CYCLE_CANDIDATE"
  | "DORMANT_CONSENTED_OPPORTUNITY"
  | "POSITIVE_FEEDBACK_VERIFIED"
  | "COMPLAINT_OR_RECOVERY_CANDIDATE"
  | "RETENTION_ACTION_VERIFICATION_DUE";

export type RetentionPolicyState = {
  workspaceId: string;
  purposeAllowed: boolean;
  channelAuthorized: boolean;
  consentState: "CONSENTED" | "NOT_CONSENTED" | "UNKNOWN";
  suppressionState: "CLEAR" | "SUPPRESSED" | "UNKNOWN";
  cadenceState: "ELIGIBLE" | "BLOCKED" | "UNKNOWN";
  humanApprovalRequired: boolean;
  humanApprovalPresent: boolean;
  highRiskEscalationRequired: boolean;
};

export type RetentionSignal = {
  protocol: "NORAUTO_RETENTION_SIGNAL_V1";
  signalId: string;
  workspaceId: string;
  opportunityId: string;
  signalType: RetentionSignalType;
  observedAt: string;
  sourceEvidenceRefs: string[];
  truthState: "DERIVED_FROM_AUTHORIZED_STATE" | "EVIDENCE_BOUND";
  authorityEffect: "NONE";
};

export type RetentionEligibility = {
  protocol: "NORAUTO_RETENTION_ELIGIBILITY_V1";
  signalId: string;
  state:
    | "ELIGIBLE_FOR_BOUNDED_TASK"
    | "SUPPRESSED"
    | "CONSENT_REQUIRED"
    | "CHANNEL_NOT_AUTHORIZED"
    | "CADENCE_BLOCKED"
    | "HUMAN_APPROVAL_REQUIRED"
    | "ESCALATE_TO_HUMAN"
    | "PURPOSE_NOT_ALLOWED";
  mayPrepareTask: boolean;
  mayAutonomouslySend: false;
  reasons: string[];
  authorityEffect: "NONE";
};

export type RetentionTask = {
  protocol: "NORAUTO_RETENTION_TASK_V1";
  taskId: string;
  workspaceId: string;
  opportunityId: string;
  signalId: string;
  signalType: RetentionSignalType;
  actionClass:
    | "HUMAN_FOLLOW_UP_REVIEW"
    | "COMMITMENT_REVIEW"
    | "NO_SHOW_RECOVERY_REVIEW"
    | "POST_VISIT_REVIEW"
    | "POST_SALE_CHECK_IN_REVIEW"
    | "SERVICE_INTRODUCTION_REVIEW"
    | "TRADE_OR_LEASE_REVIEW"
    | "RE_ENGAGEMENT_REVIEW"
    | "REFERRAL_REVIEW"
    | "COMPLAINT_ESCALATION";
  status: "PREPARED_NOT_SENT";
  createdAt: string;
  sourceEvidenceRefs: string[];
  authorityEffect: "NONE";
  outcomeClaims: {
    delivered: false;
    customerReached: false;
    customerSatisfied: false;
    retained: false;
    appointmentConfirmed: false;
    sold: false;
  };
};

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function assertIsoDate(value: string, label: string) {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a valid ISO timestamp.`);
}

export function createRetentionSignal(input: {
  workspaceId: string;
  opportunity: Pick<CrmOpportunity, "opportunityId" | "stage" | "evidence">;
  signalType: RetentionSignalType;
  observedAt: string;
  sourceEvidenceRefs: string[];
}): RetentionSignal {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("Retention signal requires an explicit workspace boundary.");
  assertIsoDate(input.observedAt, "Retention observation time");
  if (input.sourceEvidenceRefs.length === 0) {
    throw new Error("Retention signal requires at least one source evidence reference.");
  }

  if (input.signalType === "POST_SALE_CHECK_IN_DUE" && input.opportunity.stage !== "SOLD") {
    throw new Error("Post-sale retention signal requires a SOLD opportunity state established elsewhere.");
  }
  if (input.signalType === "POSITIVE_FEEDBACK_VERIFIED" && !input.sourceEvidenceRefs.some(Boolean)) {
    throw new Error("Positive feedback signal requires explicit evidence.");
  }

  const signalId = `namr_${stableHash({
    workspaceId,
    opportunityId: input.opportunity.opportunityId,
    signalType: input.signalType,
    observedAt: input.observedAt,
    evidence: input.sourceEvidenceRefs,
  }).slice(0, 24)}`;

  return {
    protocol: "NORAUTO_RETENTION_SIGNAL_V1",
    signalId,
    workspaceId,
    opportunityId: input.opportunity.opportunityId,
    signalType: input.signalType,
    observedAt: input.observedAt,
    sourceEvidenceRefs: [...new Set(input.sourceEvidenceRefs)],
    truthState: "EVIDENCE_BOUND",
    authorityEffect: "NONE",
  };
}

export function evaluateRetentionEligibility(input: {
  signal: RetentionSignal;
  policy: RetentionPolicyState;
}): RetentionEligibility {
  if (input.policy.workspaceId !== input.signal.workspaceId) {
    throw new Error("Retention policy workspace does not match signal workspace.");
  }

  const reasons: string[] = [];
  let state: RetentionEligibility["state"] = "ELIGIBLE_FOR_BOUNDED_TASK";

  if (!input.policy.purposeAllowed) {
    state = "PURPOSE_NOT_ALLOWED";
    reasons.push("Workspace policy does not permit this retention purpose.");
  } else if (input.policy.suppressionState === "SUPPRESSED" || input.policy.suppressionState === "UNKNOWN") {
    state = "SUPPRESSED";
    reasons.push(input.policy.suppressionState === "SUPPRESSED"
      ? "Suppression state blocks ordinary retention action."
      : "Suppression state is unresolved; fail closed.");
  } else if (input.policy.consentState !== "CONSENTED") {
    state = "CONSENT_REQUIRED";
    reasons.push("Required customer consent is absent or unresolved.");
  } else if (!input.policy.channelAuthorized) {
    state = "CHANNEL_NOT_AUTHORIZED";
    reasons.push("No authorized outbound channel is established for this task.");
  } else if (input.policy.cadenceState !== "ELIGIBLE") {
    state = "CADENCE_BLOCKED";
    reasons.push("Workspace cadence policy blocks or cannot yet prove eligibility.");
  } else if (input.policy.highRiskEscalationRequired) {
    state = "ESCALATE_TO_HUMAN";
    reasons.push("High-risk retention/recovery matter requires authorized human escalation.");
  } else if (input.policy.humanApprovalRequired && !input.policy.humanApprovalPresent) {
    state = "HUMAN_APPROVAL_REQUIRED";
    reasons.push("Workspace policy requires human approval before a retention task may proceed.");
  } else {
    reasons.push("Policy, consent, suppression, cadence, and channel checks support bounded task preparation.");
  }

  return {
    protocol: "NORAUTO_RETENTION_ELIGIBILITY_V1",
    signalId: input.signal.signalId,
    state,
    mayPrepareTask: state === "ELIGIBLE_FOR_BOUNDED_TASK" || state === "ESCALATE_TO_HUMAN",
    mayAutonomouslySend: false,
    reasons,
    authorityEffect: "NONE",
  };
}

function taskAction(signalType: RetentionSignalType): RetentionTask["actionClass"] {
  switch (signalType) {
    case "COMMITMENT_DUE":
    case "COMMITMENT_OVERDUE":
    case "RETENTION_ACTION_VERIFICATION_DUE":
      return "COMMITMENT_REVIEW";
    case "APPOINTMENT_NO_SHOW_CANDIDATE":
      return "NO_SHOW_RECOVERY_REVIEW";
    case "POST_VISIT_FOLLOW_UP_DUE":
      return "POST_VISIT_REVIEW";
    case "POST_SALE_CHECK_IN_DUE":
      return "POST_SALE_CHECK_IN_REVIEW";
    case "SERVICE_INTRODUCTION_DUE":
      return "SERVICE_INTRODUCTION_REVIEW";
    case "LEASE_OR_TRADE_CYCLE_CANDIDATE":
      return "TRADE_OR_LEASE_REVIEW";
    case "DORMANT_CONSENTED_OPPORTUNITY":
      return "RE_ENGAGEMENT_REVIEW";
    case "POSITIVE_FEEDBACK_VERIFIED":
      return "REFERRAL_REVIEW";
    case "COMPLAINT_OR_RECOVERY_CANDIDATE":
      return "COMPLAINT_ESCALATION";
    case "FOLLOW_UP_STALLED":
    default:
      return "HUMAN_FOLLOW_UP_REVIEW";
  }
}

export function prepareRetentionTask(input: {
  signal: RetentionSignal;
  eligibility: RetentionEligibility;
  createdAt: string;
}): RetentionTask {
  assertIsoDate(input.createdAt, "Retention task creation time");
  if (input.eligibility.signalId !== input.signal.signalId) {
    throw new Error("Retention eligibility does not belong to this signal.");
  }
  if (!input.eligibility.mayPrepareTask) {
    throw new Error(`Retention task preparation blocked: ${input.eligibility.state}`);
  }

  const taskId = `namrt_${stableHash({
    signalId: input.signal.signalId,
    actionClass: taskAction(input.signal.signalType),
  }).slice(0, 24)}`;

  return {
    protocol: "NORAUTO_RETENTION_TASK_V1",
    taskId,
    workspaceId: input.signal.workspaceId,
    opportunityId: input.signal.opportunityId,
    signalId: input.signal.signalId,
    signalType: input.signal.signalType,
    actionClass: taskAction(input.signal.signalType),
    status: "PREPARED_NOT_SENT",
    createdAt: input.createdAt,
    sourceEvidenceRefs: input.signal.sourceEvidenceRefs,
    authorityEffect: "NONE",
    outcomeClaims: {
      delivered: false,
      customerReached: false,
      customerSatisfied: false,
      retained: false,
      appointmentConfirmed: false,
      sold: false,
    },
  };
}
