import {
  applyHealthyAbsence,
  applyHealthyObservation,
  diffInventoryRecord,
  qualifyFreshness,
  DEFAULT_REFRESH_POLICY,
  type InventoryEvent,
  type LiveInventoryRecord,
  type RefreshPolicy,
} from "./live-inventory";
import { normalizeOrrAlgoliaDiscovery, type OrrAlgoliaNormalizationIssue } from "./orr-algolia-normalizer";
import type { OrrAlgoliaDiscovery } from "./orr-public-algolia";

export type OrrAlgoliaSyncResult = {
  records: LiveInventoryRecord[];
  events: InventoryEvent[];
  issues: OrrAlgoliaNormalizationIssue[];
  observedCount: number;
  priorCount: number;
};

export function reconcileOrrAlgoliaSnapshot(input: {
  previousRecords: LiveInventoryRecord[];
  discovery: OrrAlgoliaDiscovery;
  policy?: RefreshPolicy;
  nowMs?: number;
}): OrrAlgoliaSyncResult {
  if (!input.discovery.completeSnapshot || input.discovery.hits.length !== input.discovery.reportedHitCount) {
    throw new Error("Incomplete dealer snapshot cannot advance inventory presence/absence state.");
  }

  const policy = input.policy ?? DEFAULT_REFRESH_POLICY;
  const nowMs = input.nowMs ?? Date.parse(input.discovery.fetchedAt);
  const previousByVin = new Map(input.previousRecords.map((record) => [record.vin.toUpperCase(), record]));
  const normalized = normalizeOrrAlgoliaDiscovery(input.discovery);
  const nextByVin = new Map<string, LiveInventoryRecord>();

  for (const observed of normalized.records) {
    const key = observed.vin.toUpperCase();
    const previous = previousByVin.get(key);
    const { firstSeenAt: _firstSeenAt, lastSeenAt: _lastSeenAt, availabilityState: _availabilityState, consecutiveHealthyMisses: _misses, ...observation } = observed;
    void _firstSeenAt;
    void _lastSeenAt;
    void _availabilityState;
    void _misses;
    nextByVin.set(key, applyHealthyObservation(previous, observation));
  }

  // Only a complete, successfully normalized dealer snapshot is allowed to
  // count absence. A malformed hit itself is not proof that the unit sold.
  const invalidVins = new Set(normalized.issues.map((issue) => issue.vin?.toUpperCase()).filter((vin): vin is string => Boolean(vin)));
  for (const [vin, previous] of previousByVin) {
    if (nextByVin.has(vin) || invalidVins.has(vin)) continue;
    nextByVin.set(vin, applyHealthyAbsence(previous, input.discovery.fetchedAt, policy));
  }

  const events: InventoryEvent[] = [];
  const records = [...nextByVin.values()]
    .map((record) => {
      const qualified = qualifyFreshness(record, nowMs, policy);
      events.push(...diffInventoryRecord(previousByVin.get(record.vin.toUpperCase()), qualified));
      return qualified;
    })
    .sort((a, b) => a.vin.localeCompare(b.vin));

  return {
    records,
    events,
    issues: normalized.issues,
    observedCount: normalized.records.length,
    priorCount: input.previousRecords.length,
  };
}
