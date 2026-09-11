import assert from "node:assert/strict";
import {
  reconcileAuthorizedInventorySnapshot,
  type AuthorizedInventorySnapshot,
} from "../src/lib/authorized-inventory-snapshot";

const observedAt = "2026-09-10T23:45:00.000Z";
const expectedWorkspaceId = "orr-nissan-west";
const expectedDealerId = 2175;

function snapshot(overrides: Partial<AuthorizedInventorySnapshot> = {}): AuthorizedInventorySnapshot {
  return {
    protocol: "NORAUTO_AUTHORIZED_INVENTORY_SNAPSHOT_V1",
    workspaceId: expectedWorkspaceId,
    dealerId: expectedDealerId,
    provider: "synthetic-authorized-provider",
    sourceRef: "synthetic://authorized-inventory/snapshot-001",
    observedAt,
    completeSnapshot: true,
    authorization: {
      status: "VERIFIED",
      reference: "synthetic-authority://fixture-only/not-real-provider-authority",
    },
    records: [
      {
        source: "synthetic-authorized-provider",
        sourceUrl: "synthetic://authorized-inventory/vehicle-1",
        sourceVehicleId: "provider-vehicle-1",
        vin: "1N4BL4DV9SN320880",
        stockNumber: "320880P",
        year: 2025,
        make: "Nissan",
        model: "Altima",
        trim: "2.5 SV",
        condition: "Used",
        price: 19970,
        mileage: 40776,
        drivetrain: "FWD",
        transmission: "CVT",
        engine: "2.5L I4",
        bodyType: "Sedan",
        parserVersion: "synthetic-provider-adapter-v1",
      },
    ],
    ...overrides,
  };
}

function expectRejected(input: AuthorizedInventorySnapshot, expectedCode: string) {
  assert.throws(
    () => reconcileAuthorizedInventorySnapshot({
      previousRecords: [],
      snapshot: input,
      expectedWorkspaceId,
      expectedDealerId,
    }),
    (error: unknown) => error instanceof Error && error.message.includes(expectedCode),
  );
}

// Happy path: a complete, correctly scoped, authorization-gated provider batch
// can enter the truth-preserving inventory layer without becoming customer-visible.
{
  const result = reconcileAuthorizedInventorySnapshot({
    previousRecords: [],
    snapshot: snapshot(),
    expectedWorkspaceId,
    expectedDealerId,
  });
  assert.equal(result.truthState, "AUTHORIZED_SOURCE_SNAPSHOT_RECONCILED");
  assert.equal(result.authorityEffect, "NONE");
  assert.equal(result.customerVisibleLiveInventory, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].availabilityState, "ACTIVE_CURRENT");
  assert.equal(result.records[0].source, "synthetic-authorized-provider");
  assert.equal(result.events.some((event) => event.type === "VEHICLE_FIRST_SEEN"), true);
}

// Source authority must be explicitly verified by the integration layer.
for (const status of ["UNVERIFIED", "REVOKED", "EXPIRED"] as const) {
  expectRejected(snapshot({ authorization: { status, reference: "synthetic://authority" } }), "AUTHORIZATION_NOT_VERIFIED");
}
expectRejected(snapshot({ authorization: { status: "VERIFIED", reference: "" } }), "AUTHORIZATION_REFERENCE_MISSING");

// Dealer/workspace boundaries fail closed.
expectRejected(snapshot({ workspaceId: "different-dealer-workspace" }), "WORKSPACE_MISMATCH");
expectRejected(snapshot({ dealerId: 9999 }), "DEALER_MISMATCH");

// A partial provider response cannot quietly make missing vehicles look sold/removed.
expectRejected(snapshot({ completeSnapshot: false }), "SNAPSHOT_INCOMPLETE");

// Snapshot timing and identity integrity must be usable.
expectRejected(snapshot({ observedAt: "not-a-date" }), "OBSERVED_AT_INVALID");
expectRejected(snapshot({ records: [{ ...snapshot().records[0], vin: "BADVIN" }] }), "VIN_INVALID");
expectRejected(snapshot({ records: [snapshot().records[0], snapshot().records[0]] }), "DUPLICATE_VIN");

// A snapshot fingerprint must represent the data, not the arbitrary order in
// which a provider happened to return otherwise-identical vehicle records.
{
  const firstRecord = snapshot().records[0];
  const secondRecord = {
    ...firstRecord,
    sourceUrl: "synthetic://authorized-inventory/vehicle-2",
    sourceVehicleId: "provider-vehicle-2",
    vin: "1N4BL4CV7SN123456",
    stockNumber: "123456P",
    model: "Sentra",
    trim: "SV",
    price: 18750,
    mileage: 12000,
  };
  const forward = reconcileAuthorizedInventorySnapshot({
    previousRecords: [],
    snapshot: snapshot({ records: [firstRecord, secondRecord] }),
    expectedWorkspaceId,
    expectedDealerId,
  });
  const reversed = reconcileAuthorizedInventorySnapshot({
    previousRecords: [],
    snapshot: snapshot({ records: [secondRecord, firstRecord] }),
    expectedWorkspaceId,
    expectedDealerId,
  });
  assert.equal(forward.sourceDigest, reversed.sourceDigest);

  const changed = reconcileAuthorizedInventorySnapshot({
    previousRecords: [],
    snapshot: snapshot({ records: [firstRecord, { ...secondRecord, price: 18250 }] }),
    expectedWorkspaceId,
    expectedDealerId,
  });
  assert.notEqual(forward.sourceDigest, changed.sourceDigest);
}

// Complete healthy absence advances cautiously: one missing snapshot is pending,
// the second independent complete snapshot confirms removal under default policy.
{
  const first = reconcileAuthorizedInventorySnapshot({
    previousRecords: [],
    snapshot: snapshot(),
    expectedWorkspaceId,
    expectedDealerId,
  });
  const emptyOne = reconcileAuthorizedInventorySnapshot({
    previousRecords: first.records,
    snapshot: snapshot({
      observedAt: "2026-09-11T00:00:00.000Z",
      sourceRef: "synthetic://authorized-inventory/snapshot-002",
      records: [],
    }),
    expectedWorkspaceId,
    expectedDealerId,
  });
  assert.equal(emptyOne.records[0].availabilityState, "MISSING_PENDING");

  const emptyTwo = reconcileAuthorizedInventorySnapshot({
    previousRecords: emptyOne.records,
    snapshot: snapshot({
      observedAt: "2026-09-11T00:15:00.000Z",
      sourceRef: "synthetic://authorized-inventory/snapshot-003",
      records: [],
    }),
    expectedWorkspaceId,
    expectedDealerId,
  });
  assert.equal(emptyTwo.records[0].availabilityState, "REMOVED_CONFIRMED");
  assert.equal(emptyTwo.events.some((event) => event.type === "VEHICLE_REMOVED_CONFIRMED"), true);
}

// A normal price update is preserved as evidence instead of silently replacing history.
{
  const first = reconcileAuthorizedInventorySnapshot({
    previousRecords: [],
    snapshot: snapshot(),
    expectedWorkspaceId,
    expectedDealerId,
  });
  const changed = reconcileAuthorizedInventorySnapshot({
    previousRecords: first.records,
    snapshot: snapshot({
      observedAt: "2026-09-11T00:05:00.000Z",
      sourceRef: "synthetic://authorized-inventory/snapshot-price-change",
      records: [{ ...snapshot().records[0], price: 19470 }],
    }),
    expectedWorkspaceId,
    expectedDealerId,
  });
  assert.equal(changed.records[0].price, 19470);
  assert.equal(changed.events.some((event) => event.type === "PRICE_CHANGED"), true);
}

const nonClaims = {
  vendorAuthorizationEstablishedByThisTest: false,
  providerCredentialsUsed: false,
  publicOrrSiteScraped: false,
  liveInventoryActivated: false,
  customerVisibleInventoryChanged: false,
  productionDeployed: false,
};

console.log(JSON.stringify({
  protocol: "NORAUTO_AUTHORIZED_INVENTORY_ADAPTER_SYNTHETIC_TEST_V1",
  truthState: "SYNTHETIC_ADAPTER_CHALLENGES_PASS",
  authorityEffect: "NONE",
  nonClaims,
}, null, 2));
