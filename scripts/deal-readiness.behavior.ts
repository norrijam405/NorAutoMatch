import assert from "node:assert/strict";
import { buildDealReadiness } from "../src/lib/deal-readiness";
import type { DeskPrepPacket } from "../src/lib/desk-prep";

const deskPrep: DeskPrepPacket = {
  protocol: "NORAUTO_DESK_PREP_V1",
  createdAt: "2026-10-04T12:00:00.000Z",
  pipeline: "Standard Retail",
  customer: { name: "Customer", email: "customer@example.invalid", phone: "4055550100" },
  buyingLane: { budgetRange: "$30k-$35k", paymentMethod: "Financing", truthState: "CUSTOMER_STATED" },
  trade: { valuationAuthority: "MANAGER_OR_APPROVED_TRADE_PROCESS_ONLY", truthState: "UNVERIFIED" },
  vehicleEvidence: { state: "VERIFIED_LIVE", requestedVehicleIds: ["VIN1"], verifiedVehicleIds: ["VIN1"], unverifiedVehicleIds: [] },
  notes: "",
  authority: {
    finalSellingPrice: "NOT_AUTHORIZED",
    financingApproval: "NOT_AUTHORIZED",
    paymentCommitment: "NOT_AUTHORIZED",
    tradeValuation: "NOT_AUTHORIZED",
    lenderSelection: "NOT_AUTHORIZED",
    dealApproval: "MANAGER_REQUIRED",
  },
  managerReviewRequired: true,
};

const summary = buildDealReadiness({
  deskPrep,
  requiredDocumentKinds: ["DRIVER_LICENSE", "INSURANCE"],
  documents: [
    {
      protocol: "NORAUTO_AGENT_DOCUMENT_STATUS_V1",
      opportunityId: "opp-1",
      kind: "DRIVER_LICENSE",
      status: "RECEIVED",
      receivedAt: "2026-10-04T12:05:00.000Z",
      rawDocumentVisibleToAgent: false,
      storageRefVisibleToAgent: false,
      authorityEffect: "NONE",
    },
  ],
});

assert.equal(summary.readiness, "INCOMPLETE");
assert.equal(summary.items.find((item) => item.code === "DOCUMENT_DRIVER_LICENSE")?.state, "READY");
assert.equal(summary.items.find((item) => item.code === "DOCUMENT_INSURANCE")?.state, "MISSING");
assert.equal(summary.lenderSubmission, "NOT_PERFORMED");
assert.equal(summary.financingApproval, "NOT_CLAIMED");
assert.equal(summary.dealApproval, "MANAGER_REQUIRED");

const ready = buildDealReadiness({
  deskPrep,
  requiredDocumentKinds: ["DRIVER_LICENSE", "INSURANCE"],
  documents: [
    {
      protocol: "NORAUTO_AGENT_DOCUMENT_STATUS_V1",
      opportunityId: "opp-1",
      kind: "DRIVER_LICENSE",
      status: "ACCEPTED",
      receivedAt: "2026-10-04T12:05:00.000Z",
      rawDocumentVisibleToAgent: false,
      storageRefVisibleToAgent: false,
      authorityEffect: "NONE",
    },
    {
      protocol: "NORAUTO_AGENT_DOCUMENT_STATUS_V1",
      opportunityId: "opp-1",
      kind: "INSURANCE",
      status: "RECEIVED",
      receivedAt: "2026-10-04T12:06:00.000Z",
      rawDocumentVisibleToAgent: false,
      storageRefVisibleToAgent: false,
      authorityEffect: "NONE",
    },
  ],
});

assert.equal(ready.readiness, "READY_FOR_MANAGER_REVIEW");
console.log("PASS deal readiness extends existing desk prep without lender authority");
