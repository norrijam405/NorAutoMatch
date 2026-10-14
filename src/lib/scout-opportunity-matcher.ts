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
  const createdAt = input.createdAt ?? new Date().toISOString();
  const evaluationTime = Date.parse(createdAt);
  const observationTime = Date.parse(observation.observedAt);
  const expiredAt = observation.expiresAt ? Date.parse(observation.expiresAt) : undefined;
  const effectiveAt = observation.effectiveAt ? Date.parse(observation.effectiveAt) : undefined;
  const inactiveHunt = hunt.state === "CLOSED" || hunt.state === "PAUSED";
  const invalidTimeline = !Number.isFinite(evaluationTime) || !Number.isFinite(observationTime) ||
    (observation.expiresAt !== undefined && !Number.isFinite(expiredAt)) ||
    (observation.effectiveAt !== undefined && !Number.isFinite(effectiveAt));
  const outsideWindow = !invalidTimeline && (
    observationTime > evaluationTime ||
    (expiredAt !== undefined && evaluationTime >= expiredAt) ||
    (effectiveAt !== undefined && evaluationTime < effectiveAt)
  );
  if (inactiveHunt || invalidTimeline || outsideWindow) {
    return {
      protocol: "NORAUTO_SCOUT_OPPORTUNITY_MATCH_V1",
      observationId: observation.observationId,
      huntId: hunt.huntId,
      score: 0,
      reasons: [inactiveHunt ? "HUNT_NOT_ACTIVE" : invalidTimeline ? "INVALID_SCOUT_TIMELINE" : "SCOUT_OBSERVATION_OUTSIDE_EFFECTIVE_WINDOW"],
      action: "NO_ACTION",
      customerSafe: false,
      requiresHumanVerification: true,
      createdAt,
    };
  }

  const requestedMake = scalar(hunt.requirements.make?.value);
  const requestedModel = scalar(hunt.requirements.model?.value);
  const affectedMakes = new Set(observation.affectedMakes.map(normalize));
  const affectedModels = new Set(observation.affectedModels.map(normalize));

  // A topic bonus is not evidence that an observation concerns this customer's vehicle.
  // Explicit make/model mismatches fail closed, including for high-impact incentives.
  const unrelatedMake = requestedMake && affectedMakes.size > 0 && !affectedMakes.has(normalize(requestedMake));
  const unrelatedModel = requestedModel && affectedModels.size > 0 && !affectedModels.has(normalize(requestedModel));
  const noVehicleIdentityMatch =
    (!requestedMake || !affectedMakes.has(normalize(requestedMake))) &&
    (!requestedModel || !affectedModels.has(normalize(requestedModel)));
  if (unrelatedMake || unrelatedModel || noVehicleIdentityMatch) {
    return {
      protocol: "NORAUTO_SCOUT_OPPORTUNITY_MATCH_V1",
      observationId: observation.observationId,
      huntId: hunt.huntId,
      score: 0,
      reasons: ["NO_RELEVANT_VEHICLE_IDENTITY_EVIDENCE"],
      action: "NO_ACTION",
      customerSafe: false,
      requiresHumanVerification: true,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
  }

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
