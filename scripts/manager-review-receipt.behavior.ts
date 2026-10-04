import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { recordManagerReview } from "../src/lib/manager-review-receipt";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const lead: LeadPayload = {
  firstName: "Norris",
  lastName: "Buyer",
  email: "buyer@example.com",
  phone: "4055550101",
  budgetRange: "$30,000-$35,000",
  paymentMethod: "Financing",
  tradeIn: "2019 Altima, customer says approximately 80k miles",
  notes: "Needs SUV and wants to stay near target payment.",
  source: "Website",
  trigger: "retail",
  pipeline: "Standard Retail",
  shortlistedVehicleIds: ["VIN1"],
  monthlyTarget: 550,
  downPayment: 4000,
  termMonths: 60,
  consent: true,
};

const evidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN1"],
  verifiedVehicleIds: ["VIN1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T01:00:00.000Z",
  sourceFetchedAt: "2026-09-09T00:59:00.000Z",
  sourceHash: "a".repeat(64),
};

function run() {
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence: evidence, createdAt: "2026-09-09T02:05:00.000Z" });
  const handoff = createManagerHandoff({ deskPrep, createdAt: "2026-09-09T02:06:00.000Z" });

  const rejected = recordManagerReview({
    handoff,
    decision: "ACKNOWLEDGED",
    actor: {
      state: "UNVERIFIED",
      subjectId: "claimed-manager-1",
      verifier: "none",
    },
    recordedAt: "2026-09-09T02:07:00.000Z",
  });

  assert(rejected.status === "REJECTED", "Unverified manager identity must fail closed.");
  assert(rejected.truthState === "UNVERIFIED_ACTOR", "Rejected manager action must preserve explicit truth state.");
  assert(rejected.authority.managerActionScope === "NONE", "Rejected manager action must grant no action scope.");
  assert(rejected.authority.norAutoDealApproval === "NOT_GRANTED", "Manager receipt may never grant NorAutoMatch deal approval.");

  const actor = {
    state: "VERIFIED" as const,
    subjectId: "manager-verified-42",
    verifier: "future-auth-gateway",
    verifiedAt: "2026-09-09T02:06:30.000Z",
    evidenceRef: "auth-proof-42",
  };

  const appliedA = recordManagerReview({
    handoff,
    decision: "ACKNOWLEDGED",
    actor,
    recordedAt: "2026-09-09T02:07:00.000Z",
  });
  const appliedRetry = recordManagerReview({
    handoff,
    decision: "ACKNOWLEDGED",
    actor,
    recordedAt: "2026-09-09T02:08:00.000Z",
  });

  assert(appliedA.status === "APPLIED", "Verified manager identity must be eligible for handoff review action.");
  if (appliedA.status !== "APPLIED" || appliedRetry.status !== "APPLIED") throw new Error("Expected applied manager receipts.");
  assert(appliedA.truthState === "VERIFIED_MANAGER_ACTION", "Applied manager action must carry verified-manager truth state.");
  assert(appliedA.workflowEvent.to === "MANAGER_ACKNOWLEDGED", "Acknowledgement must advance only to manager acknowledged.");
  assert(appliedA.authority.managerActionScope === "HANDOFF_REVIEW_ONLY", "Manager review receipt must not imply broader deal authority.");
  assert(appliedA.authority.norAutoDealApproval === "NOT_GRANTED", "NorAutoMatch deal authority must remain absent after manager action.");
  assert(appliedA.receiptId === appliedRetry.receiptId, "Retrying same manager decision must preserve receipt identity.");
  assert(appliedA.idempotencyKey === appliedRetry.idempotencyKey, "Retrying same manager decision must preserve receipt idempotency key.");

  const returned = recordManagerReview({
    handoff,
    decision: "RETURNED_FOR_CLARIFICATION",
    actor,
    recordedAt: "2026-09-09T02:09:00.000Z",
  });
  assert(returned.status === "APPLIED", "Verified manager may return handoff for clarification.");
  if (returned.status !== "APPLIED") throw new Error("Expected returned manager receipt.");
  assert(returned.workflowEvent.to === "RETURNED_FOR_CLARIFICATION", "Return decision must preserve clarification workflow state.");
  assert(returned.idempotencyKey !== appliedA.idempotencyKey, "Different manager decision must create a distinct receipt identity.");

  console.log("PASS manager review receipt identity, authority, and fail-closed invariants");
}

run();
