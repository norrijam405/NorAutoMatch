import { strict as assert } from "node:assert";
import { createResponsePreparationPacket } from "../src/lib/conversation-response-preparation";
import { createEnrichedResponseDraft } from "../src/lib/conversation-response-enrichment";
import { createResponseEvidencePassport } from "../src/lib/evidence-passport";
import { createResponsePreparationCostReceipt } from "../src/lib/cost-receipt";
import type { ConversationEvent } from "../src/lib/conversation-gateway";

const event: ConversationEvent = {
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "workspace-cost-receipt",
  provider: "TEST_PROVIDER",
  eventId: "evt-cost-1",
  conversationId: "conv-cost-1",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
  observedAt: "2026-09-10T20:00:00.000Z",
  customer: {
    name: "Casey",
    email: "casey@example.com",
    phone: null,
    preferredContact: "EMAIL",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["stock-cost"],
    questions: ["What is the current price?"],
    constraints: [],
    urgency: "NORMAL",
  },
  summary: "Customer requested current price.",
  evidence: {
    transcriptAvailable: true,
    sourceRef: "provider:event:evt-cost-1",
    sourceHash: "sha256:cost-example",
  },
  authorityEffect: "NONE",
};

const packet = createResponsePreparationPacket({ event });
const draft = createEnrichedResponseDraft({ packet, claims: [] });
const passport = createResponseEvidencePassport({ packet, draft });
const first = createResponsePreparationCostReceipt({ passport });
const second = createResponsePreparationCostReceipt({ passport });

assert.equal(first.protocol, "IGNIAQUA_COST_RECEIPT_V1");
assert.equal(first.executionPath, "DETERMINISTIC_APPLICATION_CODE");
assert.equal(first.usage.externalModelInvocationCount, 0);
assert.equal(first.usage.externalModelDirectCostUsd, 0);
assert.equal(first.usage.paidExternalToolInvocationCount, 0);
assert.equal(first.usage.paidExternalToolDirectCostUsd, 0);
assert.equal(first.totals.knownDirectExternalCostUsd, 0);
assert.equal(first.totals.totalCostUsd, null);
assert.equal(first.measurement.truthState, "PARTIAL_MEASURED");
assert.equal(first.measurement.zeroTotalCostClaimed, false);
assert.ok(first.unknownCostCategories.includes("HOSTING_ALLOCATION"));
assert.ok(first.unknownCostCategories.includes("DATABASE_ALLOCATION"));
assert.ok(first.unknownCostCategories.includes("HUMAN_REVIEW_ALLOCATION"));
assert.equal(first.relatedEvidencePassportId, passport.passportId);
assert.equal(first.integrity.evidencePassportDigestSha256, passport.integrity.passportDigestSha256);
assert.match(first.integrity.costReceiptDigestSha256, /^[a-f0-9]{64}$/);
assert.equal(first.receiptId, second.receiptId);
assert.equal(first.integrity.costReceiptDigestSha256, second.integrity.costReceiptDigestSha256);
assert.equal(first.authorityEffect, "NONE");

// Critical moat/truth invariant: no external model charge does not imply total cost is $0.
assert.notEqual(first.totals.totalCostUsd, 0);
assert.match(first.measurement.reason, /total cost is unknown/i);

const changedPassport = {
  ...passport,
  integrity: {
    ...passport.integrity,
    passportDigestSha256: "f".repeat(64),
  },
};
const changed = createResponsePreparationCostReceipt({ passport: changedPassport });
assert.notEqual(first.receiptId, changed.receiptId);

console.log("PASS_COST_RECEIPT_TRUTH_AND_INTEGRITY_BOUNDARY");
