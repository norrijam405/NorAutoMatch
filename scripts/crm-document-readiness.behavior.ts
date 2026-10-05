import assert from "node:assert/strict";
import { deriveDeskDocumentReadiness, parseRequiredDeskDocumentKinds } from "../src/lib/crm-document-readiness";

assert.deepEqual(
  parseRequiredDeskDocumentKinds("DRIVER_LICENSE,INSURANCE,DRIVER_LICENSE"),
  ["DRIVER_LICENSE","INSURANCE"],
);
assert.throws(() => parseRequiredDeskDocumentKinds("DRIVER_LICENSE,SSN" as string), /Unsupported required/);

const none = deriveDeskDocumentReadiness({
  opportunityId: "namo_aaaaaaaaaaaaaaaaaaaaaaaa",
  requiredKinds: [],
  observed: [],
});
assert.equal(none.state, "NOT_CONFIGURED");
assert.equal(none.rawDocumentsVisible, false);
assert.equal(none.lenderSubmission, "NOT_PERFORMED");

const incomplete = deriveDeskDocumentReadiness({
  opportunityId: "namo_bbbbbbbbbbbbbbbbbbbbbbbb",
  requiredKinds: ["DRIVER_LICENSE","INSURANCE"],
  observed: [
    { kind: "DRIVER_LICENSE", status: "RECEIVED", receivedAt: "2026-10-05T00:00:00.000Z" },
  ],
});
assert.equal(incomplete.state, "INCOMPLETE");
assert.deepEqual(incomplete.required, [
  { kind: "DRIVER_LICENSE", state: "RECEIVED" },
  { kind: "INSURANCE", state: "MISSING" },
]);

const ready = deriveDeskDocumentReadiness({
  opportunityId: "namo_cccccccccccccccccccccccc",
  requiredKinds: ["DRIVER_LICENSE","INSURANCE"],
  observed: [
    { kind: "DRIVER_LICENSE", status: "ACCEPTED", receivedAt: "2026-10-05T00:00:00.000Z" },
    { kind: "INSURANCE", status: "RECEIVED", receivedAt: "2026-10-05T00:01:00.000Z" },
  ],
});
assert.equal(ready.state, "READY_FOR_MANAGER_REVIEW");
assert.equal(ready.authorityEffect, "NONE");

console.log("PASS desk document readiness truth boundary");
