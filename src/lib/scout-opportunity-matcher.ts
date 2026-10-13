import type { IndustryScoutObservation } from "./industry-scout";
import type { VehicleHunt } from "./vehicle-hunt";

export type ScoutOpportunityAction =
  | "TEXT_CUSTOMER"
  | "EMAIL_CUSTOMER"
  | "SALESPERSON_REVIEW"
  | "MANAGER_REVIEW"
  | "WATCH_ONLY"
  | "NO_ACTION";

export type ScoutOpportunityMatch = {
  protocol: "NORAUTO_SCOUT_OPPORTUNITY_MATCH_V1";
  observationId: string;
  huntId: string;
  score: number;
  reasons: string[];
  action: ScoutOpportunityAction;
  customerSafe: boolean;
  requiresHumanVerification: boolean;
  createdAt: string;
};

export function matchScoutObservationToHunt(input: {
  observation: IndustryScoutObservation;
  hunt: VehicleHunt;
  createdAt?: string;
}): ScoutOpportunityMatch {
  const { observation, hunt } = input;
  const reasons: string[] = [];
  let score = 0;

  const requestedMake = scalar(hunt.requirements.make?.value);
  const requestedModel = scalar(hunt.requirements.model?.value);
  const affectedMakes = new Set(observation.affectedMakes.map(normalize));
  const affectedModels = new Set(observation.affectedModels.map(normalize));

  if (requestedMake && affectedMakes.has(normalize(requestedMake))) {
    score += 30;
    reasons.push("AFFECTED_MAKE_MATCH");
  }

  if (requestedModel && affectedModels.has(normalize(requestedModel))) {
    score += 45;
    reasons.push("AFFECTED_MODEL_MATCH");
  }

  if (observation.topic === "INCENTIVE" || observation.topic === "APR_LEASE_PROGRAM") {
    score += 15;
    reasons.push("PURCHASE_ECONOMICS_CHANGED");
  }

  if (observation.topic === "PRICING") {
    score += 10;
    reasons.push("PRICE_CONTEXT_CHANGED");
  }

  if (observation.topic === "INVENTORY_SUPPLY") {
    score += 10;
    reasons.push("SUPPLY_CONTEXT_CHANGED");
  }

  if (observation.topic === "MODEL_LAUNCH" || observation.topic === "MODEL_REFRESH" || observation.topic === "TRIM_FEATURE_CHANGE") {
    score += 10;
    reasons.push("PRODUCT_CONTEXT_CHANGED");
  }

  if (observation.topic === "RECALL_SAFETY") {
    score += 20;
    reasons.push("SAFETY_CONTEXT_CHANGED");
  }

  if (hunt.state === "LOCAL_MATCH_FOUND" || hunt.state === "NETWORK_MATCH_FOUND" || hunt.state === "OUT_OF_NETWORK_MATCH_FOUND") {
    score += 5;
    reasons.push("ACTIVE_MATCH_EXISTS");
  }

  const customerSafe =
    observation.torqueUse === "CUSTOMER_SAFE" &&
    (observation.evidenceState === "PRIMARY_VERIFIED" || observation.evidenceState === "CORROBORATED");

  const requiresHumanVerification =
    observation.torqueUse === "MANAGER_ONLY" ||
    observation.torqueUse === "SALESPERSON_ONLY" ||
    !customerSafe;

  let action: ScoutOpportunityAction = "NO_ACTION";

  if (score >= 70 && customerSafe && hunt.consentToContact) {
    action = "TEXT_CUSTOMER";
  } else if (score >= 55 && customerSafe && hunt.consentToContact) {
    action = "EMAIL_CUSTOMER";
  } else if (score >= 40 && observation.torqueUse !== "DO_NOT_USE") {
    action = "SALESPERSON_REVIEW";
  } else if (observation.salesImpact === "HIGH_RISK") {
    action = "MANAGER_REVIEW";
  } else if (score >= 20) {
    action = "WATCH_ONLY";
  }

  if (observation.torqueUse === "DO_NOT_USE" || observation.evidenceState === "UNVERIFIED") {
    action = "NO_ACTION";
  }

  return {
    protocol: "NORAUTO_SCOUT_OPPORTUNITY_MATCH_V1",
    observationId: observation.observationId,
    huntId: hunt.huntId,
    score: Math.min(score, 100),
    reasons,
    action,
    customerSafe,
    requiresHumanVerification,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function scalar(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
