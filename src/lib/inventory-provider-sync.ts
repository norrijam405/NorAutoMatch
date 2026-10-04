import type { Pool } from "pg";
import type { InventoryProviderAdapter, InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";
import {
  loadInventoryProviderCurrentState,
  loadLatestInventoryProviderSnapshot,
  persistInventoryProviderSnapshotAndState,
} from "./inventory-provider-cache-store";
import {
  reconcileInventoryProviderCurrentState,
  type InventoryProviderStateChange,
} from "./inventory-provider-current-state";

export type InventoryProviderSyncResult = {
  providerId: string;
  dealershipId: string;
  fetchedAt: string;
  sourceHash: string;
  persistenceStatus: "COMMITTED" | "DEDUPLICATED";
  changes: InventoryProviderStateChange[];
  networkAccessOnCustomerReadPath: false;
  authorityEffect: "NONE";
};

export function assertForwardSnapshotSequence(previous: InventoryProviderSnapshot | null, currentInput: InventoryProviderSnapshot) {
  const current = assertProviderSnapshotBoundary(currentInput);
  if (!previous) return current;
  const prior = assertProviderSnapshotBoundary(previous);
  if (prior.providerId !== current.providerId) throw new Error("INVENTORY_SYNC_PROVIDER_MISMATCH");
  if (prior.dealershipId !== current.dealershipId) throw new Error("INVENTORY_SYNC_DEALERSHIP_MISMATCH");

  const priorMs = Date.parse(prior.fetchedAt);
  const currentMs = Date.parse(current.fetchedAt);
  if (!Number.isFinite(priorMs) || !Number.isFinite(currentMs)) throw new Error("INVENTORY_SYNC_FETCHED_AT_INVALID");
  if (currentMs < priorMs) throw new Error("INVENTORY_SYNC_TIME_ROLLBACK");
  if (currentMs === priorMs && current.sourceHash !== prior.sourceHash) throw new Error("INVENTORY_SYNC_SAME_TIME_SOURCE_COLLISION");
  return current;
}

export async function syncInventoryProviderCache(input: {
  pool: Pool;
  adapter: InventoryProviderAdapter;
}): Promise<InventoryProviderSyncResult> {
  const current = assertProviderSnapshotBoundary(await input.adapter.fetchSnapshot());
  if (current.providerId !== input.adapter.providerId) throw new Error("INVENTORY_SYNC_ADAPTER_PROVIDER_DRIFT");

  const previousSnapshot = await loadLatestInventoryProviderSnapshot({
    pool: input.pool,
    providerId: current.providerId,
    dealershipId: current.dealershipId,
  });
  assertForwardSnapshotSequence(previousSnapshot, current);

  const previousState = await loadInventoryProviderCurrentState({
    pool: input.pool,
    providerId: current.providerId,
    dealershipId: current.dealershipId,
  });
  const reconciled = reconcileInventoryProviderCurrentState({
    previous: previousState,
    currentSnapshot: current,
  });

  const persisted = await persistInventoryProviderSnapshotAndState({
    pool: input.pool,
    snapshot: current,
    state: reconciled.state,
  });

  return {
    providerId: current.providerId,
    dealershipId: current.dealershipId,
    fetchedAt: current.fetchedAt,
    sourceHash: current.sourceHash,
    persistenceStatus: persisted.status,
    changes: reconciled.changes,
    networkAccessOnCustomerReadPath: false,
    authorityEffect: "NONE",
  };
}
