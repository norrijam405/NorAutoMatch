import type { Pool } from "pg";
import { createPostgresCrmPool } from "./crm-postgres-adapter";
import { loadProviderCachedCatalog } from "./inventory-provider-cache-catalog";
import type { InventoryCatalog } from "./inventory-catalog";
import {
  ORR_INVENTORY_DEALERSHIP_ID,
  ORR_INVENTORY_PROVIDER_ID,
} from "./orr-inventory-provider-adapter";

let inventoryCachePool: Pool | undefined;

function getInventoryCachePool() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
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
  return loadProviderCachedCatalog({
    pool: options.pool ?? getInventoryCachePool(),
    providerId: ORR_INVENTORY_PROVIDER_ID,
    dealershipId: ORR_INVENTORY_DEALERSHIP_ID,
    mode: options.mode,
    liveActivation: options.liveActivation,
    nowMs: options.nowMs,
    maxAgeMs: options.maxAgeMs,
  });
}
