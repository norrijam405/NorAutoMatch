import { discoverOrrAlgoliaInventory } from "../src/lib/orr-public-algolia";
import { normalizeOrrAlgoliaDiscovery } from "../src/lib/orr-algolia-normalizer";

function present(value: unknown) {
  return value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");
}

async function main() {
  const discovery = await discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 });
  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const issueCounts = normalized.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    return counts;
  }, {});
  const severityCounts = normalized.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});

  if (!discovery.completeSnapshot || discovery.hits.length !== discovery.reportedHitCount) {
    throw new Error("Normalized shadow requires one complete dealer snapshot.");
  }
  if (normalized.records.length === 0) {
    throw new Error("Normalized shadow produced zero usable inventory records.");
  }
  if (issueCounts.DEALER_MISMATCH) {
    throw new Error("Dealer boundary violation detected during normalization.");
  }

  const sourceStockStatusCounts = normalized.records.reduce<Record<string, number>>((counts, record) => {
    const key = record.sourceStockStatus?.trim() || "UNSPECIFIED";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const inTransitCount = normalized.records.filter((record) => record.inTransit === true).length;
  const currentNonTransitCount = normalized.records.filter(
    (record) => record.availabilityState === "ACTIVE_CURRENT" && record.inTransit !== true,
  ).length;
  const stockNumberMissingCount = normalized.records.filter((record) => !record.stockNumber).length;

  const issueSamples = normalized.issues.slice(0, 20).map((issue) => {
    const hit = discovery.hits.find((candidate) =>
      (issue.objectID && String(candidate.objectID ?? candidate.id) === issue.objectID) ||
      (issue.vin && candidate.vin === issue.vin),
    );
    return {
      severity: issue.severity,
      code: issue.code,
      objectID: issue.objectID,
      vin: issue.vin,
      stockNumber: hit?.stock_number,
      stockStatus: hit?.stock_status,
      inTransit: hit?.in_transit,
      isActive: hit?.is_active,
      archived: hit?.archived,
      onHold: hit?.on_hold,
      presence: hit ? {
        year: present(hit.make_year),
        make: present(hit.make),
        model: present(hit.model),
        trim: present(hit.car_trim),
        stockNumber: present(hit.stock_number),
        price: present(hit.price) || present(hit.functional_price),
        category: present(hit.category) || present(hit.body_subtype),
      } : undefined,
    };
  });

  const identityGapPatterns = normalized.issues
    .filter((issue) => issue.code === "IDENTITY_INCOMPLETE")
    .reduce<Record<string, number>>((counts, issue) => {
      const hit = discovery.hits.find((candidate) =>
        (issue.objectID && String(candidate.objectID ?? candidate.id) === issue.objectID) ||
        (issue.vin && candidate.vin === issue.vin),
      );
      if (!hit) {
        counts.HIT_NOT_FOUND = (counts.HIT_NOT_FOUND ?? 0) + 1;
        return counts;
      }
      const missing = [
        ["year", hit.make_year],
        ["make", hit.make],
        ["model", hit.model],
        ["trim", hit.car_trim],
      ].filter(([, value]) => !present(value)).map(([name]) => name as string);
      const pattern = missing.join("+") || "UNKNOWN";
      counts[pattern] = (counts[pattern] ?? 0) + 1;
      return counts;
    }, {});

  const receipt = {
    mode: "NORMALIZED_SHADOW_READ_ONLY",
    dealerId: discovery.dealerId,
    sourceUrl: discovery.sourceUrl,
    sourceHash: discovery.sourceHash,
    fetchedAt: discovery.fetchedAt,
    indexName: discovery.indexName,
    rawHitCount: discovery.hits.length,
    reportedHitCount: discovery.reportedHitCount,
    pagesFetched: discovery.pagesFetched,
    completeSnapshot: discovery.completeSnapshot,
    normalizedCount: normalized.records.length,
    currentNonTransitCount,
    inTransitCount,
    stockNumberMissingCount,
    sourceStockStatusCounts,
    issueCount: normalized.issues.length,
    severityCounts,
    issueCounts,
    identityGapPatterns,
    issueSamples,
    sample: normalized.records.slice(0, 10).map((record) => ({
      vin: record.vin,
      stockNumber: record.stockNumber,
      sourceStockStatus: record.sourceStockStatus,
      inTransit: record.inTransit,
      year: record.year,
      make: record.make,
      model: record.model,
      trim: record.trim,
      condition: record.condition,
      price: record.price,
      msrp: record.msrp,
      mileage: record.mileage,
      bodyType: record.bodyType,
      availabilityState: record.availabilityState,
      parserVersion: record.parserVersion,
      sourceHash: record.sourceHash,
    })),
  };

  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
