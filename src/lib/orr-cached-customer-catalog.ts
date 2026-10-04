import type { Pool } from "pg";
import { createPostgresCrmPool } from "./crm-postgres-adapter";
import { loadProviderCachedCatalog } from "./inventory-provider-cache-catalog";
import type { InventoryCatalog } from "./inventory-catalog";
import { resolveInventoryRuntime } from "./inventory-runtime";
import {
  ORR_INVENTORY_DEALERSHIP_ID,
  ORR_INVENTORY_PROVIDER_ID,
} from "./orr-inventory-provider-identity";

let inventoryCachePool: Pool | undefined;

function getInventoryCachePool() {
  const connectionString = process.env.NORAUTO_INVENTORY_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("INVENTORY_CACHE_DATABASE_UNAVAILABLE");
  inventoryCachePool ??= createPostgresCrmPool(connectionString);
  return inventoryCachePool;
}

export async function loadOrrCachedCustomerCatalog(options: {
  mode?: string;
  liveActivation?: string;
  nowMs?: number;
  maxAgeMs?: number;
  pool?: Pool;
} = {}): Promise<InventoryCatalog> {
  const runtime = resolveInventoryRuntime({ mode: options.mode, liveActivation: options.liveActivation });
  const pool = runtime.effectiveMode === "live-enabled"
    ? options.pool ?? getInventoryCachePool()
    : options.pool;

  return loadProviderCachedCatalog({
    pool,
    providerId: ORR_INVENTORY_PROVIDER_ID,
    dealershipId: ORR_INVENTORY_DEALERSHIP_ID,
    mode: options.mode,
    liveActivation: options.liveActivation,
    nowMs: options.nowMs,
    maxAgeMs: options.maxAgeMs,
  });
}
