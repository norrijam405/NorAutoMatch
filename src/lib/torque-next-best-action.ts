import type { VehicleHunt } from "./vehicle-hunt";
import type { ScoutOpportunityMatch } from "./scout-opportunity-matcher";

export type TorqueNextBestAction =
  | "REFRESH_VERIFIED_INVENTORY"
  | "VERIFY_WITH_MANAGER"
  | "PREPARE_TEXT"
  | "PREPARE_EMAIL"
  | "REVIEW_COMPARABLE"
  | "WAIT_FOR_CHANGE"
  | "NO_ACTION";

export type TorqueNextBestActionDecision = {
  protocol: "NORAUTO_TORQUE_NEXT_BEST_ACTION_V1";
  huntId: string;
  action: TorqueNextBestAction;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  requiresHuman: boolean;
  maySendAutomatically: false;
  authorityEffect: "NONE";
};

export function chooseTorqueNextBestAction(input: {
  hunt: Pick<VehicleHunt, "huntId" | "state" | "consentToContact" | "candidateVins" | "truth">;
  scoutMatch?: ScoutOpportunityMatch;
}): TorqueNextBestActionDecision {
  const reasons: string[] = [];

  if (input.scoutMatch?.action === "MANAGER_REVIEW") {
    return decision(input.hunt.huntId, "VERIFY_WITH_MANAGER", "HIGH", ["SCOUT_HIGH_RISK_REVIEW"], true);
  }

  if (input.hunt.state === "NETWORK_MATCH_FOUND" || input.hunt.state === "OUT_OF_NETWORK_MATCH_FOUND") {
    reasons.push("SOURCING_PATH_REQUIRES_HUMAN_VERIFICATION");
    return decision(input.hunt.huntId, "VERIFY_WITH_MANAGER", "HIGH", reasons, true);
  }

  if (input.hunt.state === "LOCAL_MATCH_FOUND") {
    if (input.hunt.consentToContact) {
      reasons.push("VERIFIED_LOCAL_MATCH_AVAILABLE");
      return decision(input.hunt.huntId, "PREPARE_TEXT", "HIGH", reasons, false);
    }
    reasons.push("LOCAL_MATCH_EXISTS_BUT_CONTACT_CONSENT_NOT_ESTABLISHED");
    return decision(input.hunt.huntId, "WAIT_FOR_CHANGE", "MEDIUM", reasons, true);
  }

  if (input.scoutMatch?.action === "TEXT_CUSTOMER" && input.hunt.consentToContact) {
    reasons.push("VERIFIED_SCOUT_CHANGE_RELEVANT_TO_HUNT");
    return decision(input.hunt.huntId, "PREPARE_TEXT", "HIGH", reasons, false);
  }

  if (input.scoutMatch?.action === "EMAIL_CUSTOMER" && input.hunt.consentToContact) {
    reasons.push("SCOUT_CHANGE_RELEVANT_TO_HUNT");
    return decision(input.hunt.huntId, "PREPARE_EMAIL", "MEDIUM", reasons, false);
  }

  if (input.hunt.state === "SEARCHING") {
    reasons.push("HUNT_HAS_NOT_YET_COMPLETED_VERIFIED_INVENTORY_CHECK");
    return decision(input.hunt.huntId, "REFRESH_VERIFIED_INVENTORY", "HIGH", reasons, false);
  }

  if (input.hunt.state === "AWAITING_HUMAN_VERIFICATION") {
    if (input.hunt.candidateVins.length > 0) {
      reasons.push("CANDIDATES_EXIST_BUT_REQUIRE_REVIEW");
      return decision(input.hunt.huntId, "REVIEW_COMPARABLE", "MEDIUM", reasons, true);
    }
    reasons.push("NO_VERIFIED_CANDIDATE_CHANGE");
    return decision(input.hunt.huntId, "WAIT_FOR_CHANGE", "LOW", reasons, false);
  }

  if (input.hunt.state === "PAUSED" || input.hunt.state === "CLOSED") {
    reasons.push("HUNT_NOT_ACTIVE");
    return decision(input.hunt.huntId, "NO_ACTION", "LOW", reasons, false);
  }

  reasons.push("NO_HIGH_VALUE_CHANGE_DETECTED");
  return decision(input.hunt.huntId, "WAIT_FOR_CHANGE", "LOW", reasons, false);
}

function decision(
  huntId: string,
  action: TorqueNextBestAction,
  priority: TorqueNextBestActionDecision["priority"],
  reasons: string[],
  requiresHuman: boolean,
): TorqueNextBestActionDecision {
  return {
    protocol: "NORAUTO_TORQUE_NEXT_BEST_ACTION_V1",
    huntId,
    action,
    priority,
    reasons,
    requiresHuman,
    maySendAutomatically: false,
    authorityEffect: "NONE",
  };
}
