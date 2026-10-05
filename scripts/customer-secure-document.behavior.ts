import assert from "node:assert/strict";
import { secureDocumentReceiptSchema, toAgentDocumentStatus, documentKindAllowsChatSummary } from "../src/lib/customer-secure-document";

const receipt = secureDocumentReceiptSchema.parse({
  protocol: "NORAUTO_SECURE_DOCUMENT_RECEIPT_V1",
  documentId: "d0b6038a-3e11-4fb5-8783-09cb448e23f8",
  opportunityId: "opp-001",
  kind: "DRIVER_LICENSE",
  receivedAt: "2026-10-04T12:00:00.000Z",
  status: "RECEIVED",
  source: "CUSTOMER_SECURE_UPLOAD",
  storageRef: "private/customer-documents/opaque-object",
  originalFilename: "license.jpg",
  mimeType: "image/jpeg",
  byteSize: 123456,
  sha256: "a".repeat(64),
  uploadedByUserId: null,
  authorityEffect: "NONE",
});

const agentView = toAgentDocumentStatus(receipt);
assert.equal(agentView.rawDocumentVisibleToAgent, false);
assert.equal(agentView.storageRefVisibleToAgent, false);
assert.equal("storageRef" in agentView, false);
assert.equal("originalFilename" in agentView, false);
assert.equal(agentView.kind, "DRIVER_LICENSE");
assert.equal(agentView.status, "RECEIVED");
assert.equal(documentKindAllowsChatSummary("DRIVER_LICENSE"), false);
assert.equal(documentKindAllowsChatSummary("INSURANCE"), false);
assert.equal(documentKindAllowsChatSummary("TRADE_OFFER"), true);

assert.throws(() => secureDocumentReceiptSchema.parse({
  ...receipt,
  byteSize: 30 * 1024 * 1024,
}), /too_big|less than or equal/i);

console.log("PASS secure customer document metadata boundary");
