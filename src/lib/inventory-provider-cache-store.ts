import type { Pool, PoolClient } from "pg";
import type { InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";
import type { InventoryProviderCurrentState } from "./inventory-provider-current-state";

export type PersistInventoryProviderSnapshotResult = {
  status: "COMMITTED" | "DEDUPLICATED";
  providerId: string;
  dealershipId: string;
  fetchedAt: string;
  sourceHash: string;
  recordCount: number;
  authorityEffect: "NONE";
};

async function persistSnapshotWithClient(client: PoolClient, snapshot: InventoryProviderSnapshot): Promise<"COMMITTED" | "DEDUPLICATED"> {
  const existing = await client.query<{ source_hash: string }>(
    `SELECT source_hash
       FROM inventory_provider_snapshots
      WHERE provider_id=$1 AND dealership_id=$2 AND fetched_at=$3::timestamptz
      FOR UPDATE`,
    [snapshot.providerId, snapshot.dealershipId, snapshot.fetchedAt],
  );

  if (existing.rowCount === 1) {
    const row = existing.rows[0];
    if (!row || row.source_hash !== snapshot.sourceHash) throw new Error("INVENTORY_SNAPSHOT_IDENTITY_COLLISION");
    return "DEDUPLICATED";
  }

  await client.query(
    `INSERT INTO inventory_provider_snapshots (
       provider_id, dealership_id, dealership_name, fetched_at, source_url, source_hash, normalized_snapshot
     ) VALUES ($1,$2,$3,$4::timestamptz,$5,$6,$7::jsonb)`,
    [snapshot.providerId, snapshot.dealershipId, snapshot.dealershipName, snapshot.fetchedAt, snapshot.sourceUrl, snapshot.sourceHash, JSON.stringify(snapshot)],
  );
  return "COMMITTED";
}

async function upsertCurrentStateWithClient(client: PoolClient, state: InventoryProviderCurrentState) {
  await client.query(
    `INSERT INTO inventory_provider_current_state (
       provider_id, dealership_id, dealership_name, as_of, source_url, source_hash, state_json, updated_at
     ) VALUES ($1,$2,$3,$4::timestamptz,$5,$6,$7::jsonb,NOW())
     ON CONFLICT (provider_id, dealership_id) DO UPDATE SET
       dealership_name=EXCLUDED.dealership_name,
       as_of=EXCLUDED.as_of,
       source_url=EXCLUDED.source_url,
       source_hash=EXCLUDED.source_hash,
       state_json=EXCLUDED.state_json,
       updated_at=NOW()`,
    [state.providerId, state.dealershipId, state.dealershipName, state.asOf, state.sourceUrl, state.sourceHash, JSON.stringify(state)],
  );
}

export async function persistInventoryProviderSnapshot(input: {
  pool: Pool;
  snapshot: InventoryProviderSnapshot;
}): Promise<PersistInventoryProviderSnapshotResult> {
  const snapshot = assertProviderSnapshotBoundary(input.snapshot);
  const client = await input.pool.connect();

  try {
    await client.query("BEGIN");
    const status = await persistSnapshotWithClient(client, snapshot);
    await client.query("COMMIT");
    return {
      status,
      providerId: snapshot.providerId,
      dealershipId: snapshot.dealershipId,
      fetchedAt: snapshot.fetchedAt,
      sourceHash: snapshot.sourceHash,
      recordCount: snapshot.records.length,
      authorityEffect: "NONE",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Inventory snapshot transaction and rollback failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function persistInventoryProviderSnapshotAndState(input: {
  pool: Pool;
  snapshot: InventoryProviderSnapshot;
  state: InventoryProviderCurrentState;
}): Promise<PersistInventoryProviderSnapshotResult> {
  const snapshot = assertProviderSnapshotBoundary(input.snapshot);
  if (input.state.providerId !== snapshot.providerId) throw new Error("INVENTORY_STATE_PROVIDER_MISMATCH");
  if (input.state.dealershipId !== snapshot.dealershipId) throw new Error("INVENTORY_STATE_DEALERSHIP_MISMATCH");
  if (input.state.asOf !== snapshot.fetchedAt) throw new Error("INVENTORY_STATE_AS_OF_MISMATCH");
  if (input.state.sourceHash !== snapshot.sourceHash) throw new Error("INVENTORY_STATE_SOURCE_HASH_MISMATCH");

  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const status = await persistSnapshotWithClient(client, snapshot);
    await upsertCurrentStateWithClient(client, input.state);
    await client.query("COMMIT");
    return {
      status,
      providerId: snapshot.providerId,
      dealershipId: snapshot.dealershipId,
      fetchedAt: snapshot.fetchedAt,
      sourceHash: snapshot.sourceHash,
      recordCount: snapshot.records.length,
      authorityEffect: "NONE",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Inventory snapshot/state transaction and rollback failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function loadLatestInventoryProviderSnapshot(input: {
  pool: Pool;
  providerId: string;
  dealershipId: string;
}): Promise<InventoryProviderSnapshot | null> {
  const result = await input.pool.query<{ normalized_snapshot: InventoryProviderSnapshot }>(
    `SELECT normalized_snapshot
       FROM inventory_provider_snapshots
      WHERE provider_id=$1 AND dealership_id=$2
      ORDER BY fetched_at DESC
      LIMIT 1`,
    [input.providerId, input.dealershipId],
  );
  const row = result.rows[0];
  return row ? assertProviderSnapshotBoundary(row.normalized_snapshot) : null;
}

export async function loadInventoryProviderCurrentState(input: {
  pool: Pool;
  providerId: string;
  dealershipId: string;
}): Promise<InventoryProviderCurrentState | null> {
  const result = await input.pool.query<{ state_json: InventoryProviderCurrentState }>(
    `SELECT state_json
       FROM inventory_provider_current_state
      WHERE provider_id=$1 AND dealership_id=$2
      LIMIT 1`,
    [input.providerId, input.dealershipId],
  );
  const state = result.rows[0]?.state_json;
  if (!state) return null;
  if (state.providerId !== input.providerId || state.dealershipId !== input.dealershipId) throw new Error("INVENTORY_CURRENT_STATE_IDENTITY_DRIFT");
  return state;
}
