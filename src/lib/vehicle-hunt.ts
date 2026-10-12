import { createHash } from "node:crypto";
import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";

export type VehicleHuntState =
  | "CAPTURING"
  | "SEARCHING"
  | "LOCAL_MATCH_FOUND"
  | "NETWORK_MATCH_FOUND"
  | "OUT_OF_NETWORK_MATCH_FOUND"
  | "AWAITING_HUMAN_VERIFICATION"
  | "CUSTOMER_REVIEW"
  | "PAUSED"
  | "CLOSED";

export type VehicleHuntOrigin = "TORQUE_CHAT" | "FRESH_UP" | "GARAGE" | "MANUAL_SALESPERSON";

export type VehicleHuntCandidate = {
  vin: string;
  sourceScope: "LOCAL_STORE" | "ORR_GROUP" | "ORR_NISSAN_SIBLING" | "NISSAN_NATIONAL" | "OUT_OF_NETWORK";
  sourceLabel: string;
  observedAt: string;
  fit: "EXACT" | "STRONG" | "NEAR";
  verified: boolean;
  reasons: string[];
  compromises: string[];
};

export type VehicleHunt = {
  protocol: "NORAUTO_VEHICLE_HUNT_V1";
  huntId: string;
  workspaceId: string;
  opportunityId?: string;
  userId?: string;
  origin: VehicleHuntOrigin;
  state: VehicleHuntState;
  createdAt: string;
  updatedAt: string;
  requirements: TorqueSalesInventorySpec;
  explicitCustomerText: string;
  matchDnaLabel?: string;
  candidateVins: VehicleHuntCandidate[];
  preferredContactOrder: Array<"TEXT" | "EMAIL">;
  consentToContact: boolean;
  salespersonOwner?: string;
  truth: {
    exactLocalMatchVerified: boolean;
    sourcingRequired: boolean;
    humanVerificationRequired: boolean;
    transferPromised: false;
    financingPromised: false;
  };
};

export function createVehicleHunt(input: {
  workspaceId: string;
  origin: VehicleHuntOrigin;
  requirements: TorqueSalesInventorySpec;
  explicitCustomerText: string;
  createdAt?: string;
  opportunityId?: string;
  userId?: string;
  matchDnaLabel?: string;
  consentToContact: boolean;
  salespersonOwner?: string;
}): VehicleHunt {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("Vehicle Hunt requires an explicit workspace.");
  const explicitCustomerText = input.explicitCustomerText.trim();
  if (!explicitCustomerText) throw new Error("Vehicle Hunt requires the customer's explicit request text.");
  if (explicitCustomerText.length > 4000) throw new Error("Vehicle Hunt request text exceeds supported length.");

  const createdAt = input.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) throw new Error("Vehicle Hunt requires a valid creation time.");

  const identity = createHash("sha256").update(JSON.stringify({
    workspaceId,
    opportunityId: input.opportunityId ?? null,
    userId: input.userId ?? null,
    origin: input.origin,
    explicitCustomerText,
    requirements: input.requirements,
    createdAt,
  }), "utf8").digest("hex");

  return {
    protocol: "NORAUTO_VEHICLE_HUNT_V1",
    huntId: "namh_" + identity.slice(0, 24),
    workspaceId,
    opportunityId: input.opportunityId,
    userId: input.userId,
    origin: input.origin,
    state: "SEARCHING",
    createdAt,
    updatedAt: createdAt,
    requirements: input.requirements,
    explicitCustomerText,
    matchDnaLabel: input.matchDnaLabel,
    candidateVins: [],
    preferredContactOrder: ["TEXT", "EMAIL"],
    consentToContact: input.consentToContact,
    salespersonOwner: input.salespersonOwner,
    truth: {
      exactLocalMatchVerified: false,
      sourcingRequired: false,
      humanVerificationRequired: false,
      transferPromised: false,
      financingPromised: false,
    },
  };
}

export function applyVehicleHuntCandidates(input: {
  hunt: VehicleHunt;
  candidates: VehicleHuntCandidate[];
  observedAt?: string;
}): VehicleHunt {
  const observedAt = input.observedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(observedAt))) throw new Error("Vehicle Hunt update requires a valid observation time.");

  const unique = new Map<string, VehicleHuntCandidate>();
  for (const candidate of input.candidates) {
    const vin = candidate.vin.trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error("Vehicle Hunt candidate requires a valid VIN.");
    unique.set(vin, { ...candidate, vin });
  }
  const candidates = [...unique.values()];

  const exactLocal = candidates.some(
    (candidate) => candidate.sourceScope === "LOCAL_STORE" && candidate.fit === "EXACT" && candidate.verified,
  );
  const network = candidates.some((candidate) =>
    candidate.sourceScope === "ORR_GROUP" || candidate.sourceScope === "ORR_NISSAN_SIBLING",
  );
  const external = candidates.some((candidate) =>
    candidate.sourceScope === "NISSAN_NATIONAL" || candidate.sourceScope === "OUT_OF_NETWORK",
  );

  const state: VehicleHuntState = exactLocal
    ? "LOCAL_MATCH_FOUND"
    : network
      ? "NETWORK_MATCH_FOUND"
      : external
        ? "OUT_OF_NETWORK_MATCH_FOUND"
        : "AWAITING_HUMAN_VERIFICATION";

  return {
    ...input.hunt,
    state,
    updatedAt: observedAt,
    candidateVins: candidates,
    truth: {
      ...input.hunt.truth,
      exactLocalMatchVerified: exactLocal,
      sourcingRequired: !exactLocal,
      humanVerificationRequired: !exactLocal,
      transferPromised: false,
      financingPromised: false,
    },
  };
}
