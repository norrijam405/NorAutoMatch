import { Pool } from "pg";
import { syncInventoryProviderCache } from "../src/lib/inventory-provider-sync";
import { OrrInventoryProviderAdapter } from "../src/lib/orr-inventory-provider-adapter";

const SYNC_ACTIVATION_VALUE = "ENABLE_AUTHORIZED_INVENTORY_SYNC";

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString?.trim()) throw new Error("NORAUTO_CRM_DATABASE_URL is required for inventory provider sync.");
  if (process.env.NORAUTO_INVENTORY_SYNC_ACTIVATION !== SYNC_ACTIVATION_VALUE) {
    throw new Error("INVENTORY_SYNC_ACTIVATION_MISSING");
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const result = await syncInventoryProviderCache({
      pool,
      adapter: new OrrInventoryProviderAdapter(),
    });

    console.log(JSON.stringify({
      protocol: "NORAUTO_PROVIDER_CACHE_SYNC_RECEIPT_V1",
      truthState: "AUTHORIZED_SOURCE_SYNC_COMPLETED",
      providerId: result.providerId,
      dealershipId: result.dealershipId,
      fetchedAt: result.fetchedAt,
      sourceHash: result.sourceHash,
      persistenceStatus: result.persistenceStatus,
      changeCounts: result.changes.reduce<Record<string, number>>((counts, change) => {
        counts[change.type] = (counts[change.type] ?? 0) + 1;
        return counts;
      }, {}),
      customerVisibleLiveInventoryChanged: false,
      networkAccessOnCustomerReadPath: result.networkAccessOnCustomerReadPath,
      authorityEffect: result.authorityEffect,
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("NORAUTO_PROVIDER_CACHE_SYNC_FAILED", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
