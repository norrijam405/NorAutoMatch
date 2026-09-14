import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  loadInventoryProviderCurrentState,
  loadLatestInventoryProviderSnapshot,
  persistInventoryProviderSnapshotAndState,
} from "../src/lib/inventory-provider-cache-store";
import { reconcileInventoryProviderCurrentState } from "../src/lib/inventory-provider-current-state";
import type { InventoryProviderSnapshot } from "../src/lib/inventory-provider-contract";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for inventory cache persistence integration test.");

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5_000 });

const snapshot: InventoryProviderSnapshot = {
  providerId: "integration-provider",
  dealershipId: "dealer-2175",
  dealershipName: "Integration Dealer",
  authorized: true,
  fetchedAt: "2026-09-14T20:00:00.000Z",
  sourceUrl: "https://example.invalid/inventory",
  sourceHash: "integration-source-hash-1",
  records: [
    {
      providerId: "integration-provider",
      dealershipId: "dealer-2175",
      dealershipName: "Integration Dealer",
      sourceUrl: "https://example.invalid/inventory",
      sourceRecordId: "source-record-1",
      sourceFetchedAt: "2026-09-14T20:00:00.000Z",
      sourceHash: "record-source-hash-1",
      vin: "1N4BL4DV9SN320880",
      stockNumber: "320880P",
      modelYear: "2026.5",
      make: "Nissan",
      model: "Rogue",
      trim: "SV",
      condition: "New",
      price: 29995,
      mileage: 12,
      drivetrain: "AWD",
      bodyType: "SUV",
      availabilityState: "active",
      features: ["Apple CarPlay"],
      sourcePhotos: [{ url: "https://example.invalid/rogue.jpg" }],
    },
  ],
};

try {
  await pool.query("DELETE FROM inventory_provider_current_state WHERE provider_id=$1 AND dealership_id=$2", [snapshot.providerId, snapshot.dealershipId]);
  await pool.query("DELETE FROM inventory_provider_snapshots WHERE provider_id=$1 AND dealership_id=$2", [snapshot.providerId, snapshot.dealershipId]);

  const firstState = reconcileInventoryProviderCurrentState({ previous: null, currentSnapshot: snapshot }).state;
  const committed = await persistInventoryProviderSnapshotAndState({ pool, snapshot, state: firstState });
  assert.equal(committed.status, "COMMITTED");
  assert.equal(committed.recordCount, 1);

  const deduplicated = await persistInventoryProviderSnapshotAndState({ pool, snapshot, state: firstState });
  assert.equal(deduplicated.status, "DEDUPLICATED");

  await assert.rejects(
    () => persistInventoryProviderSnapshotAndState({
      pool,
      snapshot: { ...snapshot, sourceHash: "conflicting-source-hash" },
      state: { ...firstState, sourceHash: "conflicting-source-hash" },
    }),
    /INVENTORY_SNAPSHOT_IDENTITY_COLLISION/,
  );

  const loadedSnapshot = await loadLatestInventoryProviderSnapshot({
    pool,
    providerId: snapshot.providerId,
    dealershipId: snapshot.dealershipId,
  });
  assert.ok(loadedSnapshot);
  assert.equal(loadedSnapshot.sourceHash, snapshot.sourceHash);
  assert.equal(loadedSnapshot.records[0]?.modelYear, "2026.5");

  const loadedState = await loadInventoryProviderCurrentState({
    pool,
    providerId: snapshot.providerId,
    dealershipId: snapshot.dealershipId,
  });
  assert.ok(loadedState);
  assert.equal(loadedState.records[0]?.availabilityState, "active");

  const missingSnapshot: InventoryProviderSnapshot = {
    ...snapshot,
    fetchedAt: "2026-09-14T21:00:00.000Z",
    sourceHash: "integration-source-hash-2",
    records: [],
  };
  const missingState = reconcileInventoryProviderCurrentState({ previous: loadedState, currentSnapshot: missingSnapshot }).state;
  await persistInventoryProviderSnapshotAndState({ pool, snapshot: missingSnapshot, state: missingState });

  const reloadedMissingState = await loadInventoryProviderCurrentState({
    pool,
    providerId: snapshot.providerId,
    dealershipId: snapshot.dealershipId,
  });
  assert.equal(reloadedMissingState?.records[0]?.availabilityState, "missing-once");

  const missingAgainSnapshot: InventoryProviderSnapshot = {
    ...missingSnapshot,
    fetchedAt: "2026-09-14T22:00:00.000Z",
    sourceHash: "integration-source-hash-3",
  };
  const missingAgainState = reconcileInventoryProviderCurrentState({ previous: reloadedMissingState, currentSnapshot: missingAgainSnapshot }).state;
  await persistInventoryProviderSnapshotAndState({ pool, snapshot: missingAgainSnapshot, state: missingAgainState });

  const reloadedRepeatedState = await loadInventoryProviderCurrentState({
    pool,
    providerId: snapshot.providerId,
    dealershipId: snapshot.dealershipId,
  });
  assert.equal(reloadedRepeatedState?.records[0]?.availabilityState, "missing-repeatedly");

  console.log("PASS_PROVIDER_NEUTRAL_INVENTORY_CACHE_POSTGRES");
} finally {
  await pool.query("DELETE FROM inventory_provider_current_state WHERE provider_id=$1 AND dealership_id=$2", [snapshot.providerId, snapshot.dealershipId]).catch(() => undefined);
  await pool.query("DELETE FROM inventory_provider_snapshots WHERE provider_id=$1 AND dealership_id=$2", [snapshot.providerId, snapshot.dealershipId]).catch(() => undefined);
  await pool.end();
}
