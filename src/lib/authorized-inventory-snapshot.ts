import { createHash } from "node:crypto";
import {
  applyHealthyAbsence,
  applyHealthyObservation,
  applySourceError,
  diffInventoryRecord,
  qualifyFreshness,
  DEFAULT_REFRESH_POLICY,
  type InventoryEvent,
  type LiveInventoryRecord,
  type RefreshPolicy,
} from "./live-inventory";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

export type InventoryAuthorizationEvidence = {
  status: "VERIFIED" | "UNVERIFIED" | "REVOKED" | "EXPIRED";
  reference: string;
};

export type AuthorizedInventoryObservation = Omit<
  LiveInventoryRecord,
  "availabilityState" | "firstSeenAt" | "lastSeenAt" | "consecutiveHealthyMisses" | "fetchedAt" | "sourceHash"
> & {
  vin: string;
};

export type AuthorizedInventorySnapshot = {
  protocol: "NORAUTO_AUTHORIZED_INVENTORY_SNAPSHOT_V1";
  workspaceId: string;
  dealerId: number;
  provider: string;
  sourceRef: string;
  observedAt: string;
  completeSnapshot: boolean;
  authorization: InventoryAuthorizationEvidence;
  records: AuthorizedInventoryObservation[];
};

export type AuthorizedInventoryIssue = {
  severity: "WARNING" | "ERROR";
  code:
    | "AUTHORIZATION_NOT_VERIFIED"
    | "AUTHORIZATION_REFERENCE_MISSING"
    | "WORKSPACE_MISMATCH"
    | "DEALER_MISMATCH"
    | "SNAPSHOT_INCOMPLETE"
    | "OBSERVED_AT_INVALID"
    | "VIN_INVALID"
    | "DUPLICATE_VIN";
  vin?: string;
  message: string;
};

export type AuthorizedInventoryReconciliation = {
  truthState: "AUTHORIZED_SOURCE_SNAPSHOT_RECONCILED";
  authorityEffect: "NONE";
  customerVisibleLiveInventory: false;
  records: LiveInventoryRecord[];
  events: InventoryEvent[];
  issues: AuthorizedInventoryIssue[];
  sourceDigest: string;
};

function canonicalDigest(snapshot: AuthorizedInventorySnapshot) {
  const canonical = JSON.stringify({
    ...snapshot,
    records: [...snapshot.records]
      .map((record) => ({ ...record, vin: record.vin.toUpperCase() }))
      .sort((a, b) => a.vin.localeCompare(b.vin)),
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function assertSnapshotBoundary(input: {
  snapshot: AuthorizedInventorySnapshot;
  expectedWorkspaceId: string;
  expectedDealerId: number;
}) {
  const issues: AuthorizedInventoryIssue[] = [];
  const { snapshot } = input;

  if (snapshot.authorization.status !== "VERIFIED") {
    issues.push({
      severity: "ERROR",
      code: "AUTHORIZATION_NOT_VERIFIED",
      message: `Inventory source authorization is ${snapshot.authorization.status}; VERIFIED is required.`,
    });
  }
  if (!snapshot.authorization.reference.trim()) {
    issues.push({
      severity: "ERROR",
      code: "AUTHORIZATION_REFERENCE_MISSING",
      message: "Verified inventory authorization must carry an auditable reference supplied by the authorized integration layer.",
    });
  }
  if (snapshot.workspaceId !== input.expectedWorkspaceId) {
    issues.push({ severity: "ERROR", code: "WORKSPACE_MISMATCH", message: "Inventory snapshot belongs to a different workspace." });
  }
  if (snapshot.dealerId !== input.expectedDealerId) {
    issues.push({ severity: "ERROR", code: "DEALER_MISMATCH", message: "Inventory snapshot belongs to a different dealer identity." });
  }
  if (!snapshot.completeSnapshot) {
    issues.push({
      severity: "ERROR",
      code: "SNAPSHOT_INCOMPLETE",
      message: "Partial provider snapshots cannot be used to infer vehicle removal.",
    });
  }
  if (!Number.isFinite(Date.parse(snapshot.observedAt))) {
    issues.push({ severity: "ERROR", code: "OBSERVED_AT_INVALID", message: "Inventory snapshot observation time is invalid." });
  }

  const vins = new Set<string>();
  for (const record of snapshot.records) {
    const vin = record.vin.toUpperCase();
    if (!VIN_RE.test(vin)) {
      issues.push({ severity: "ERROR", code: "VIN_INVALID", vin, message: "Provider record does not contain a valid VIN." });
      continue;
    }
    if (vins.has(vin)) {
      issues.push({ severity: "ERROR", code: "DUPLICATE_VIN", vin, message: "Provider snapshot contains the same VIN more than once." });
      continue;
    }
    vins.add(vin);
  }

  return issues;
}

/**
 * Source-neutral receiving dock for an already-authorized provider integration.
 *
 * This function does not acquire credentials, call a vendor, or establish that
 * a claimed authorization is legally sufficient. It requires the integration
 * layer to supply VERIFIED authorization evidence and fails closed otherwise.
 * Its job is to keep provider-specific transport outside the inventory truth
 * and matching layers while preserving dealer/workspace boundaries.
 */
export function reconcileAuthorizedInventorySnapshot(input: {
  previousRecords: LiveInventoryRecord[];
  snapshot: AuthorizedInventorySnapshot;
  expectedWorkspaceId: string;
  expectedDealerId: number;
  policy?: RefreshPolicy;
  nowMs?: number;
}): AuthorizedInventoryReconciliation {
  const issues = assertSnapshotBoundary(input);
  if (issues.some((issue) => issue.severity === "ERROR")) {
    const error = new Error(issues.map((issue) => `${issue.code}: ${issue.message}`).join(" | "));
    error.name = "AuthorizedInventorySnapshotRejected";
    throw error;
  }

  const snapshot = input.snapshot;
  const sourceDigest = canonicalDigest(snapshot);
  const previousByVin = new Map(input.previousRecords.map((record) => [record.vin.toUpperCase(), record]));
  const nextByVin = new Map<string, LiveInventoryRecord>();

  for (const raw of snapshot.records) {
    const vin = raw.vin.toUpperCase();
    const previous = previousByVin.get(vin);
    const observation = {
      ...raw,
      vin,
      source: snapshot.provider,
      sourceUrl: snapshot.sourceRef,
      fetchedAt: snapshot.observedAt,
      sourceHash: sourceDigest,
    };
    nextByVin.set(vin, applyHealthyObservation(previous, observation));
  }

  // Absence only means something because the snapshot was explicitly complete.
  for (const [vin, previous] of previousByVin) {
    if (!nextByVin.has(vin)) {
      nextByVin.set(vin, applyHealthyAbsence(previous, snapshot.observedAt, input.policy ?? DEFAULT_REFRESH_POLICY));
    }
  }

  const events: InventoryEvent[] = [];
  const nowMs = input.nowMs ?? Date.parse(snapshot.observedAt);
  const records = [...nextByVin.values()]
    .map((record) => {
      const qualified = qualifyFreshness(record, nowMs, input.policy ?? DEFAULT_REFRESH_POLICY);
      events.push(...diffInventoryRecord(previousByVin.get(record.vin.toUpperCase()), qualified));
      return qualified;
    })
    .sort((a, b) => a.vin.localeCompare(b.vin));

  return {
    truthState: "AUTHORIZED_SOURCE_SNAPSHOT_RECONCILED",
    authorityEffect: "NONE",
    customerVisibleLiveInventory: false,
    records,
    events,
    issues,
    sourceDigest,
  };
}

// Keep this import intentionally referenced in the source-neutral module so a
// future transport adapter can preserve prior records on per-record source
// errors without treating those failures as removal evidence.
void applySourceError;
