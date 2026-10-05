import assert from "node:assert/strict";
import { buildCustomerDealPrepSummary } from "../src/lib/customer-deal-prep";

const empty = buildCustomerDealPrepSummary({ savedVehicleCount: 0, documents: [] });
assert.equal(empty.workspaceState, "GETTING_STARTED");
assert.equal(empty.lenderSubmission, "NOT_PERFORMED");
assert.equal(empty.rawDocumentsVisibleToTorque, false);

const building = buildCustomerDealPrepSummary({
  savedVehicleCount: 2,
  documents: [
    { kind: "DRIVER_LICENSE", status: "RECEIVED", opportunityId: null, rawDeletedAt: null },
    { kind: "INSURANCE", status: "REVIEW_REQUIRED", opportunityId: null, rawDeletedAt: null },
    { kind: "TRADE_OFFER", status: "EXPIRED", opportunityId: null, rawDeletedAt: "2026-10-05T00:00:00.000Z" },
  ],
});
assert.equal(building.workspaceState, "BUILDING_PACKET");
assert.equal(building.documentCount, 2);
assert.equal(building.readyDocumentCount, 1);
assert.equal(building.unresolvedDocumentCount, 1);

const linked = buildCustomerDealPrepSummary({
  savedVehicleCount: 1,
  documents: [
    { kind: "INSURANCE", status: "ACCEPTED", opportunityId: "namo_0123456789abcdef01234567", rawDeletedAt: null },
  ],
});
assert.equal(linked.workspaceState, "DESK_LINKED");
assert.equal(linked.linkedDocumentCount, 1);
assert.equal(linked.financingApproval, "NOT_CLAIMED");

console.log("PASS customer deal prep summary truth boundary");
