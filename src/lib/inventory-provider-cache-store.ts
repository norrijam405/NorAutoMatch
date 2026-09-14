import type { Pool } from "pg";
import type { InventoryProviderSnapshot } from "./inventory-provider-contract";
import { assertProviderSnapshotBoundary } from "./inventory-provider-contract";

export type PersistInventoryProviderSnapshotResult = {
  status: "COMMITTED" | "DEDUPLICATED";
  providerId: string;
  dealershipId: string;
  fetchedAt: string;
  sourceHash: string;
  recordCount: number;
  authorityEffect: "NONE";
};

export async function persistInventoryProviderSnapshot(input: {
  pool: Pool;
  snapshot: InventoryProviderSnapshot;
}): Promise<PersistInventoryProviderSnapshotResult> {
  const snapshot = assertProviderSnapshotBoundary(input.snapshot);
  const client = await input.pool.connect();

  try {
    await client.query("BEGIN");
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
      await client.query("COMMIT");
      return {
        status: "DEDUPLICATED",
        providerId: snapshot.providerId,
        dealershipId: snapshot.dealershipId,
        fetchedAt: snapshot.fetchedAt,
        sourceHash: snapshot.sourceHash,
        recordCount: snapshot.records.length,
        authorityEffect: "NONE",
      };
    }

    await client.query(
      `INSERT INTO inventory_provider_snapshots (
         provider_id, dealership_id, dealership_name, fetched_at, source_url, source_hash, normalized_snapshot
       ) VALUES ($1,$2,$3,$4::timestamptz,$5,$6,$7::jsonb)`,
      [snapshot.providerId, snapshot.dealershipId, snapshot.dealershipName, snapshot.fetchedAt, snapshot.sourceUrl, snapshot.sourceHash, JSON.stringify(snapshot)],
    );

    await client.query("COMMIT");
    return {
      status: "COMMITTED",
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
