import assert from "node:assert/strict";
import {
  applyLegalHold,
  createRedactionRequest,
  evaluateDataLifecycle,
  markBackupResolved,
  markExternalCopiesRemoved,
  markPrimaryRedacted,
  type DataLifecycleRecord,
} from "../src/lib/data-lifecycle";

const requested = createRedactionRequest({
  workspaceId: "norautomatch",
  opportunityId: "namo_0123456789abcdef01234567",
  requestRef: "privacy-request:test-001",
  requestAuthority: "AUTHORIZED_PRIVACY_PROCESS",
  requestedAt: "2026-09-11T23:00:00Z",
  externalCopies: "MAY_EXIST",
});

assert.equal(requested.state, "REDACTION_REQUESTED");
assert.equal(requested.authorityEffect, "NONE");

const requestDecision = evaluateDataLifecycle(requested);
assert.equal(requestDecision.decision, "REDACT_PRIMARY");
assert.equal(requestDecision.operationalSuppressionRequired, true);
assert.equal(requestDecision.backupTruth, "PENDING_SEPARATE_DISPOSITION");
assert.equal(requestDecision.externalCopyTruth, "MAY_EXIST");

assert.throws(
  () => createRedactionRequest({
    workspaceId: "norautomatch",
    opportunityId: "namo_0123456789abcdef01234567",
    requestRef: "privacy-request:test-invalid-external",
    requestAuthority: "AUTHORIZED_PRIVACY_PROCESS",
    requestedAt: "2026-09-11T23:00:00Z",
    externalCopies: "SEPARATELY_CONFIRMED_REMOVED" as never,
  }),
  /EXTERNAL_REMOVAL_REQUIRES_SEPARATE_EVIDENCE/,
);

const held = applyLegalHold({
  record: requested,
  legalHoldRef: "legal-hold:test-001",
  legalHoldAuthority: "AUTHORIZED_LEGAL_PROCESS",
  observedAt: "2026-09-11T23:01:00Z",
});
const holdDecision = evaluateDataLifecycle(held);
assert.equal(holdDecision.decision, "BLOCKED_BY_LEGAL_HOLD");
assert.equal(holdDecision.operationalSuppressionRequired, false);
assert.throws(
  () => markPrimaryRedacted({ record: held, redactedAt: "2026-09-11T23:02:00Z" }),
  /PRIMARY_REDACTION_NOT_AUTHORIZED_BY_STATE/,
);

const redacted = markPrimaryRedacted({
  record: requested,
  redactedAt: "2026-09-11T23:03:00Z",
});
assert.equal(redacted.state, "PRIMARY_REDACTED_BACKUP_PENDING");
assert.equal(redacted.backupDisposition, "PENDING_EXPIRY");
const redactedDecision = evaluateDataLifecycle(redacted);
assert.equal(redactedDecision.decision, "NO_ACTION_ALREADY_REDACTED");
assert.equal(redactedDecision.operationalSuppressionRequired, true);
assert.equal(redactedDecision.backupTruth, "PENDING_SEPARATE_DISPOSITION");
assert.throws(
  () => applyLegalHold({
    record: redacted,
    legalHoldRef: "legal-hold:late",
    legalHoldAuthority: "AUTHORIZED_LEGAL_PROCESS",
    observedAt: "2026-09-11T23:04:00Z",
  }),
  /CANNOT_RESTORE_REDACTED_PII/,
);

const externalResolved = markExternalCopiesRemoved({
  record: redacted,
  dispositionRef: "external-removal:test-001",
  dispositionAuthority: "AUTHORIZED_EXTERNAL_DISPOSITION",
  observedAt: "2026-09-11T23:04:30Z",
});
assert.equal(externalResolved.externalCopies, "SEPARATELY_CONFIRMED_REMOVED");
assert.equal(externalResolved.externalDispositionAuthority, "AUTHORIZED_EXTERNAL_DISPOSITION");

const backupResolved = markBackupResolved({
  record: externalResolved,
  dispositionRef: "backup-expiry:test-001",
  dispositionAuthority: "AUTHORIZED_BACKUP_DISPOSITION",
  observedAt: "2026-09-11T23:05:00Z",
});
assert.equal(backupResolved.state, "PRIMARY_REDACTED_BACKUP_EXPIRED");
assert.equal(backupResolved.backupDisposition, "EXPIRED_OR_PURGED");
assert.equal(backupResolved.backupDispositionAuthority, "AUTHORIZED_BACKUP_DISPOSITION");
assert.equal(evaluateDataLifecycle(backupResolved).backupTruth, "SEPARATELY_RESOLVED");

const active: DataLifecycleRecord = {
  protocol: "NORAUTO_DATA_LIFECYCLE_V1",
  workspaceId: "norautomatch",
  opportunityId: "namo_0123456789abcdef01234567",
  state: "ACTIVE",
  backupDisposition: "UNKNOWN",
  externalCopies: "NOT_KNOWN",
  authorityEffect: "NONE",
};
assert.equal(evaluateDataLifecycle(active).decision, "KEEP_ACTIVE");

assert.throws(
  () => createRedactionRequest({
    workspaceId: " ",
    opportunityId: "namo_0123456789abcdef01234567",
    requestRef: "privacy-request:test-002",
    requestAuthority: "AUTHORIZED_PRIVACY_PROCESS",
    requestedAt: "2026-09-11T23:00:00Z",
  }),
  /WORKSPACE_REQUIRED/,
);
assert.throws(
  () => createRedactionRequest({
    workspaceId: "norautomatch",
    opportunityId: "namo_0123456789abcdef01234567",
    requestRef: "privacy-request:test-003",
    requestAuthority: "AUTHORIZED_PRIVACY_PROCESS",
    requestedAt: "not-a-time",
  }),
  /INVALID_TIMESTAMP/,
);
assert.throws(
  () => markExternalCopiesRemoved({
    record: active,
    dispositionRef: "external-removal:too-early",
    dispositionAuthority: "AUTHORIZED_EXTERNAL_DISPOSITION",
    observedAt: "2026-09-11T23:06:00Z",
  }),
  /EXTERNAL_REMOVAL_REQUIRES_PRIMARY_REDACTION/,
);

const malformedHold: DataLifecycleRecord = {
  ...active,
  state: "LEGAL_HOLD",
};
assert.throws(() => evaluateDataLifecycle(malformedHold), /HOLD_EVIDENCE_INCOMPLETE/);

const malformedRequest: DataLifecycleRecord = {
  ...active,
  state: "REDACTION_REQUESTED",
};
assert.throws(() => evaluateDataLifecycle(malformedRequest), /REDACTION_REQUEST_EVIDENCE_INCOMPLETE/);

console.log("data lifecycle behavior: PASS");
