import { discoverOrrAlgoliaInventory } from "../src/lib/orr-public-algolia";
import { normalizeOrrAlgoliaDiscovery } from "../src/lib/orr-algolia-normalizer";

async function main() {
  const discovery = await discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 });
  const normalized = normalizeOrrAlgoliaDiscovery(discovery);
  const issueCounts = normalized.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
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
    issueCount: normalized.issues.length,
    issueCounts,
    sample: normalized.records.slice(0, 10).map((record) => ({
      vin: record.vin,
      stockNumber: record.stockNumber,
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
