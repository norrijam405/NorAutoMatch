export type DataLifecycleState =
  | "ACTIVE"
  | "REDACTION_REQUESTED"
  | "LEGAL_HOLD"
  | "PRIMARY_REDACTED_BACKUP_PENDING"
  | "PRIMARY_REDACTED_BACKUP_EXPIRED";

export type BackupDisposition = "NOT_APPLICABLE" | "PENDING_EXPIRY" | "EXPIRED_OR_PURGED" | "UNKNOWN";

export type DataLifecycleRecord = {
  protocol: "NORAUTO_DATA_LIFECYCLE_V1";
  workspaceId: string;
  opportunityId: string;
  state: DataLifecycleState;
  requestRef?: string;
  requestAuthority?: string;
  requestedAt?: string;
  legalHoldRef?: string;
  legalHoldAuthority?: string;
  legalHoldObservedAt?: string;
  primaryRedactedAt?: string;
  backupDisposition: BackupDisposition;
  backupDispositionRef?: string;
  externalCopies: "NOT_KNOWN" | "MAY_EXIST" | "SEPARATELY_CONFIRMED_REMOVED";
  authorityEffect: "NONE";
};

export type DataLifecycleDecision = {
  protocol: "NORAUTO_DATA_LIFECYCLE_DECISION_V1";
  decision: "KEEP_ACTIVE" | "BLOCKED_BY_LEGAL_HOLD" | "REDACT_PRIMARY" | "NO_ACTION_ALREADY_REDACTED";
  operationalSuppressionRequired: boolean;
  backupTruth: "NOT_REDACTED_BY_PRIMARY_ACTION" | "PENDING_SEPARATE_DISPOSITION" | "SEPARATELY_RESOLVED";
  externalCopyTruth: DataLifecycleRecord["externalCopies"];
  reasons: string[];
  authorityEffect: "NONE";
};

function requireBounded(value: string, label: string, max = 512) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label}_REQUIRED`);
  if (normalized.length > max) throw new Error(`${label}_TOO_LONG`);
  return normalized;
}

function requireIso(value: string, label: string) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`${label}_INVALID_TIMESTAMP`);
  return new Date(ms).toISOString();
}

export function createRedactionRequest(input: {
  workspaceId: string;
  opportunityId: string;
  requestRef: string;
  requestAuthority: string;
  requestedAt: string;
  externalCopies?: DataLifecycleRecord["externalCopies"];
}): DataLifecycleRecord {
  return {
    protocol: "NORAUTO_DATA_LIFECYCLE_V1",
    workspaceId: requireBounded(input.workspaceId, "DATA_LIFECYCLE_WORKSPACE", 128),
    opportunityId: requireBounded(input.opportunityId, "DATA_LIFECYCLE_OPPORTUNITY", 128),
    state: "REDACTION_REQUESTED",
    requestRef: requireBounded(input.requestRef, "DATA_LIFECYCLE_REQUEST_REF"),
    requestAuthority: requireBounded(input.requestAuthority, "DATA_LIFECYCLE_REQUEST_AUTHORITY", 256),
    requestedAt: requireIso(input.requestedAt, "DATA_LIFECYCLE_REQUESTED_AT"),
    backupDisposition: "UNKNOWN",
    externalCopies: input.externalCopies ?? "NOT_KNOWN",
    authorityEffect: "NONE",
  };
}

export function applyLegalHold(input: {
  record: DataLifecycleRecord;
  legalHoldRef: string;
  legalHoldAuthority: string;
  observedAt: string;
}): DataLifecycleRecord {
  if (input.record.state === "PRIMARY_REDACTED_BACKUP_PENDING" || input.record.state === "PRIMARY_REDACTED_BACKUP_EXPIRED") {
    throw new Error("DATA_LIFECYCLE_LEGAL_HOLD_CANNOT_RESTORE_REDACTED_PII");
  }
  return {
    ...input.record,
    state: "LEGAL_HOLD",
    legalHoldRef: requireBounded(input.legalHoldRef, "DATA_LIFECYCLE_HOLD_REF"),
    legalHoldAuthority: requireBounded(input.legalHoldAuthority, "DATA_LIFECYCLE_HOLD_AUTHORITY", 256),
    legalHoldObservedAt: requireIso(input.observedAt, "DATA_LIFECYCLE_HOLD_OBSERVED_AT"),
  };
}

export function evaluateDataLifecycle(record: DataLifecycleRecord): DataLifecycleDecision {
  if (record.state === "LEGAL_HOLD") {
    if (!record.legalHoldRef || !record.legalHoldAuthority || !record.legalHoldObservedAt) {
      throw new Error("DATA_LIFECYCLE_HOLD_EVIDENCE_INCOMPLETE");
    }
    return {
      protocol: "NORAUTO_DATA_LIFECYCLE_DECISION_V1",
      decision: "BLOCKED_BY_LEGAL_HOLD",
      operationalSuppressionRequired: false,
      backupTruth: "NOT_REDACTED_BY_PRIMARY_ACTION",
      externalCopyTruth: record.externalCopies,
      reasons: ["EXPLICIT_LEGAL_HOLD_PRESENT"],
      authorityEffect: "NONE",
    };
  }

  if (record.state === "REDACTION_REQUESTED") {
    if (!record.requestRef || !record.requestAuthority || !record.requestedAt) {
      throw new Error("DATA_LIFECYCLE_REDACTION_REQUEST_EVIDENCE_INCOMPLETE");
    }
    return {
      protocol: "NORAUTO_DATA_LIFECYCLE_DECISION_V1",
      decision: "REDACT_PRIMARY",
      operationalSuppressionRequired: true,
      backupTruth: "PENDING_SEPARATE_DISPOSITION",
      externalCopyTruth: record.externalCopies,
      reasons: ["EVIDENCE_BOUND_REDACTION_REQUEST_PRESENT", "PRIMARY_REDACTION_DOES_NOT_PROVE_BACKUP_OR_EXTERNAL_DELETION"],
      authorityEffect: "NONE",
    };
  }

  if (record.state === "PRIMARY_REDACTED_BACKUP_PENDING" || record.state === "PRIMARY_REDACTED_BACKUP_EXPIRED") {
    if (!record.primaryRedactedAt) throw new Error("DATA_LIFECYCLE_PRIMARY_REDACTION_TIMESTAMP_REQUIRED");
    return {
      protocol: "NORAUTO_DATA_LIFECYCLE_DECISION_V1",
      decision: "NO_ACTION_ALREADY_REDACTED",
      operationalSuppressionRequired: true,
      backupTruth: record.state === "PRIMARY_REDACTED_BACKUP_EXPIRED" ? "SEPARATELY_RESOLVED" : "PENDING_SEPARATE_DISPOSITION",
      externalCopyTruth: record.externalCopies,
      reasons: ["PRIMARY_RECORD_ALREADY_REDACTED"],
      authorityEffect: "NONE",
    };
  }

  return {
    protocol: "NORAUTO_DATA_LIFECYCLE_DECISION_V1",
    decision: "KEEP_ACTIVE",
    operationalSuppressionRequired: false,
    backupTruth: "NOT_REDACTED_BY_PRIMARY_ACTION",
    externalCopyTruth: record.externalCopies,
    reasons: ["NO_EVIDENCE_BOUND_REDACTION_REQUEST"],
    authorityEffect: "NONE",
  };
}

export function markPrimaryRedacted(input: {
  record: DataLifecycleRecord;
  redactedAt: string;
  backupDisposition?: Exclude<BackupDisposition, "EXPIRED_OR_PURGED">;
}): DataLifecycleRecord {
  const decision = evaluateDataLifecycle(input.record);
  if (decision.decision !== "REDACT_PRIMARY") throw new Error("DATA_LIFECYCLE_PRIMARY_REDACTION_NOT_AUTHORIZED_BY_STATE");
  return {
    ...input.record,
    state: "PRIMARY_REDACTED_BACKUP_PENDING",
    primaryRedactedAt: requireIso(input.redactedAt, "DATA_LIFECYCLE_PRIMARY_REDACTED_AT"),
    backupDisposition: input.backupDisposition ?? "PENDING_EXPIRY",
  };
}

export function markBackupResolved(input: {
  record: DataLifecycleRecord;
  dispositionRef: string;
}): DataLifecycleRecord {
  if (input.record.state !== "PRIMARY_REDACTED_BACKUP_PENDING") {
    throw new Error("DATA_LIFECYCLE_BACKUP_RESOLUTION_REQUIRES_PRIMARY_REDACTION");
  }
  return {
    ...input.record,
    state: "PRIMARY_REDACTED_BACKUP_EXPIRED",
    backupDisposition: "EXPIRED_OR_PURGED",
    backupDispositionRef: requireBounded(input.dispositionRef, "DATA_LIFECYCLE_BACKUP_DISPOSITION_REF"),
  };
}
