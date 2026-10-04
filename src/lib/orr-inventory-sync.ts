import {
  applyHealthyAbsence,
  applyHealthyObservation,
  applySourceError,
  diffInventoryRecord,
  qualifyFreshness,
  type InventoryEvent,
  type LiveInventoryRecord,
  type RefreshPolicy,
  DEFAULT_REFRESH_POLICY,
} from "@/lib/live-inventory";
import {
  discoverOrrPublicInventory,
  fetchOrrPublicVehicle,
  OrrPublicInventoryError,
  type OrrPublicFetchOptions,
} from "@/lib/orr-public-inventory";

export type OrrInventorySyncIssue = {
  sourceUrl?: string;
  vin?: string;
  code: string;
  message: string;
};

export type OrrInventorySyncResult = {
  syncStartedAt: string;
  syncCompletedAt: string;
  discoverySourceUrl: string;
  discoveryHash: string;
  discoveredVehicleCount: number;
  records: LiveInventoryRecord[];
  events: InventoryEvent[];
  issues: OrrInventorySyncIssue[];
};

export type OrrInventorySyncOptions = {
  fetch?: OrrPublicFetchOptions;
  policy?: RefreshPolicy;
  maxConcurrentVehicleFetches?: number;
  now?: () => Date;
};

function vinFromOrrUrl(sourceUrl: string) {
  const pathname = new URL(sourceUrl).pathname;
  return pathname.match(/-([A-HJ-NPR-Z0-9]{17})$/i)?.[1]?.toUpperCase();
}

function errorIssue(error: unknown, sourceUrl?: string, vin?: string): OrrInventorySyncIssue {
  if (error instanceof OrrPublicInventoryError) {
    return { sourceUrl, vin, code: error.code, message: error.message };
  }
  return {
    sourceUrl,
    vin,
    code: "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "Unexpected inventory sync error.",
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const safeLimit = Math.max(1, Math.min(8, Math.floor(limit)));
  const output = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(safeLimit, items.length) }, () => runWorker()));
  return output;
}

/**
 * Reconcile one complete public-site refresh.
 *
 * Safety properties:
 * - Discovery must succeed before absence can count toward removal.
 * - A VDP fetch/parser failure never increments a healthy-miss counter.
 * - A single healthy absence remains MISSING_PENDING under the default policy.
 * - Historical values are preserved through append-only InventoryEvent output.
 * - Returned records are freshness-qualified before downstream matching.
 */
export async function syncOrrPublicInventory(
  previousRecords: LiveInventoryRecord[],
  options: OrrInventorySyncOptions = {},
): Promise<OrrInventorySyncResult> {
  const now = options.now ?? (() => new Date());
  const policy = options.policy ?? DEFAULT_REFRESH_POLICY;
  const startedAt = now().toISOString();

  // This is the authority boundary for removal inference: if discovery fails,
  // this function throws and callers must preserve the previous snapshot.
  const discovery = await discoverOrrPublicInventory(options.fetch);
  const previousByVin = new Map(previousRecords.map((record) => [record.vin.toUpperCase(), record]));
  const discoveredByVin = new Map<string, string>();
  const issues: OrrInventorySyncIssue[] = [];

  for (const sourceUrl of discovery.vehicleUrls) {
    const vin = vinFromOrrUrl(sourceUrl);
    if (!vin) {
      issues.push({
        sourceUrl,
        code: "DISCOVERY_VIN_MISSING",
        message: "Discovered Orr VDP URL did not contain a valid 17-character VIN.",
      });
      continue;
    }
    if (discoveredByVin.has(vin) && discoveredByVin.get(vin) !== sourceUrl) {
      issues.push({
        sourceUrl,
        vin,
        code: "DISCOVERY_DUPLICATE_VIN",
        message: "The same VIN was discovered under multiple public VDP URLs; first URL retained.",
      });
      continue;
    }
    discoveredByVin.set(vin, sourceUrl);
  }

  const discoveredEntries = [...discoveredByVin.entries()];
  const fetched = await mapWithConcurrency(
    discoveredEntries,
    options.maxConcurrentVehicleFetches ?? 4,
    async ([vin, sourceUrl]) => {
      const previous = previousByVin.get(vin);
      try {
        const observation = await fetchOrrPublicVehicle(sourceUrl, options.fetch);
        if (observation.vin.toUpperCase() !== vin) {
          issues.push({
            sourceUrl,
            vin,
            code: "VDP_VIN_MISMATCH",
            message: `VDP parsed VIN ${observation.vin} does not match discovered VIN ${vin}.`,
          });
          return previous ? applySourceError(previous, discovery.fetchedAt) : undefined;
        }
        return applyHealthyObservation(previous, observation);
      } catch (error) {
        issues.push(errorIssue(error, sourceUrl, vin));
        return previous ? applySourceError(previous, discovery.fetchedAt) : undefined;
      }
    },
  );

  const nextByVin = new Map<string, LiveInventoryRecord>();
  for (const record of fetched) {
    if (record) nextByVin.set(record.vin.toUpperCase(), record);
  }

  // Only VINs absent from a successfully completed discovery snapshot count as
  // healthy absence. Individual VDP failures above do not enter this path.
  for (const [vin, previous] of previousByVin) {
    if (!discoveredByVin.has(vin)) {
      nextByVin.set(vin, applyHealthyAbsence(previous, discovery.fetchedAt, policy));
    }
  }

  const events: InventoryEvent[] = [];
  const qualifiedRecords = [...nextByVin.values()]
    .map((record) => {
      const qualified = qualifyFreshness(record, now().getTime(), policy);
      events.push(...diffInventoryRecord(previousByVin.get(record.vin.toUpperCase()), qualified));
      return qualified;
    })
    .sort((a, b) => a.vin.localeCompare(b.vin));

  return {
    syncStartedAt: startedAt,
    syncCompletedAt: now().toISOString(),
    discoverySourceUrl: discovery.sourceUrl,
    discoveryHash: discovery.sourceHash,
    discoveredVehicleCount: discoveredByVin.size,
    records: qualifiedRecords,
    events,
    issues,
  };
}
