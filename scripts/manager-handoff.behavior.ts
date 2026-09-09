import { buildCrmHandoffDelivery } from "../src/lib/crm-handoff-delivery";
import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { advanceWorkflow, createManagerHandoff, managerDecisionTransition } from "../src/lib/manager-handoff";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectThrow(fn: () => unknown, message: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
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
  const packet = buildDeskPrepPacket({
    lead,
    inventoryEvidence: evidence,
    createdAt: "2026-09-09T01:30:00.000Z",
  });

  const handoffA = createManagerHandoff({ deskPrep: packet, createdAt: "2026-09-09T01:31:00.000Z" });
  const handoffRetry = createManagerHandoff({ deskPrep: packet, createdAt: "2026-09-09T01:32:00.000Z" });

  assert(handoffA.protocol === "NORAUTO_MANAGER_HANDOFF_V1", "Manager handoff protocol identity must be explicit.");
  assert(handoffA.workflowState === "MANAGER_REVIEW_PENDING", "System may only hand off into manager review pending.");
  assert(handoffA.authority.approveDeal === "NOT_AUTHORIZED", "NorAutoMatch cannot carry deal approval authority.");
  assert(handoffA.authority.changePrice === "NOT_AUTHORIZED", "NorAutoMatch cannot carry final price authority.");
  assert(handoffA.authority.approveFinancing === "NOT_AUTHORIZED", "NorAutoMatch cannot approve financing.");
  assert(handoffA.authority.valueTrade === "NOT_AUTHORIZED", "NorAutoMatch cannot value the trade.");
  assert(handoffA.handoffId === handoffRetry.handoffId, "Retrying the same desk facts must preserve handoff identity.");
  assert(handoffA.idempotencyKey === handoffRetry.idempotencyKey, "Retrying the same desk facts must preserve idempotency key.");

  const changedPacket = buildDeskPrepPacket({
    lead: { ...lead, notes: "Customer changed requested vehicle requirements." },
    inventoryEvidence: evidence,
    createdAt: "2026-09-09T01:33:00.000Z",
  });
  const changedHandoff = createManagerHandoff({ deskPrep: changedPacket });
  assert(changedHandoff.idempotencyKey !== handoffA.idempotencyKey, "Material desk fact changes must create a new handoff identity.");

  const toInventory = advanceWorkflow({ from: "LEAD_CAPTURED", to: "INVENTORY_REVALIDATED", actor: "NORAUTO_SYSTEM" });
  assert(toInventory.to === "INVENTORY_REVALIDATED", "System must be able to record inventory revalidation.");
  const toDesk = advanceWorkflow({ from: "INVENTORY_REVALIDATED", to: "DESK_PREP_READY", actor: "NORAUTO_SYSTEM" });
  assert(toDesk.to === "DESK_PREP_READY", "System must be able to prepare desk packet.");
  const toManager = advanceWorkflow({ from: "DESK_PREP_READY", to: "MANAGER_REVIEW_PENDING", actor: "NORAUTO_SYSTEM" });
  assert(toManager.to === "MANAGER_REVIEW_PENDING", "System must be able to submit for manager review.");

  const accepted = managerDecisionTransition({ current: "MANAGER_REVIEW_PENDING", decision: "ACKNOWLEDGED" });
  assert(accepted.actor === "MANAGER" && accepted.to === "MANAGER_ACKNOWLEDGED", "Only manager decision path may acknowledge review.");
  const returned = managerDecisionTransition({ current: "MANAGER_REVIEW_PENDING", decision: "RETURNED_FOR_CLARIFICATION" });
  assert(returned.actor === "MANAGER" && returned.to === "RETURNED_FOR_CLARIFICATION", "Manager must be able to return a handoff for clarification.");
  const clarified = advanceWorkflow({ from: "RETURNED_FOR_CLARIFICATION", to: "DESK_PREP_READY", actor: "NORAUTO_SYSTEM" });
  assert(clarified.to === "DESK_PREP_READY", "NorAutoMatch may rebuild desk prep after manager requests clarification.");

  expectThrow(
    () => advanceWorkflow({ from: "MANAGER_REVIEW_PENDING", to: "MANAGER_ACKNOWLEDGED", actor: "NORAUTO_SYSTEM" }),
    "NorAutoMatch must never self-acknowledge manager review.",
  );
  expectThrow(
    () => advanceWorkflow({ from: "DESK_PREP_READY", to: "MANAGER_ACKNOWLEDGED", actor: "MANAGER" }),
    "Manager cannot skip the review-pending handoff state.",
  );
  expectThrow(
    () => advanceWorkflow({ from: "RETURNED_FOR_CLARIFICATION", to: "MANAGER_REVIEW_PENDING", actor: "MANAGER" }),
    "Manager must not resubmit the system's clarified packet on NorAutoMatch's behalf.",
  );

  const deliveryLead = {
    ...lead,
    inventoryEvidence: evidence,
    submittedAt: "2026-09-09T01:31:00.000Z",
    pageUrl: "https://norautomatch.example/",
    userAgent: "test-agent",
  };
  const delivery = buildCrmHandoffDelivery({ lead: deliveryLead, managerHandoff: handoffA });
  const retryDelivery = buildCrmHandoffDelivery({ lead: deliveryLead, managerHandoff: handoffRetry });

  assert(delivery.payload.protocol === "NORAUTO_CRM_HANDOFF_V1", "CRM delivery protocol must be explicit.");
  assert(delivery.payload.managerHandoff.handoffId === handoffA.handoffId, "CRM payload must preserve the exact handoff identity.");
  assert(delivery.headers["Idempotency-Key"] === handoffA.idempotencyKey, "CRM retry key must use deterministic handoff identity.");
  assert(delivery.headers["X-NorAuto-Handoff-Id"] === handoffA.handoffId, "CRM request must surface handoff identity independently of body parsing.");
  assert(retryDelivery.headers["Idempotency-Key"] === delivery.headers["Idempotency-Key"], "Same handoff retry must send the same CRM idempotency key.");

  console.log("PASS manager handoff authority, workflow, and idempotency invariants");
}

run();
