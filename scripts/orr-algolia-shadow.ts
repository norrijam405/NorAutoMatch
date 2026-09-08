import { discoverOrrAlgoliaInventory } from "../src/lib/orr-public-algolia";

const SENSITIVE_KEY_RE = /(api.?key|secret|token|authorization|cookie|password)/i;

function safeShape(value: unknown, depth = 0): unknown {
  if (depth > 2) return Array.isArray(value) ? `[array:${value.length}]` : typeof value;
  if (Array.isArray(value)) return value.slice(0, 2).map((item) => safeShape(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    output[key] = safeShape(child, depth + 1);
  }
  return output;
}

async function main() {
  const result = await discoverOrrAlgoliaInventory({ hitsPerPage: 10 });
  if (result.hits.length === 0) {
    throw new Error("Live shadow query returned zero dealer_id 2175 hits; refusing to claim discovery success.");
  }

  const firstHit = result.hits[0];
  const receipt = {
    mode: "SHADOW_READ_ONLY",
    sourceUrl: result.sourceUrl,
    sourceHash: result.sourceHash,
    fetchedAt: result.fetchedAt,
    indexName: result.indexName,
    dealerId: result.dealerId,
    hitCount: result.hits.length,
    firstHitKeys: Object.keys(firstHit).filter((key) => !SENSITIVE_KEY_RE.test(key)).sort(),
    firstHitSafeShape: safeShape(firstHit),
    sample: result.hits.map((hit) => ({
      objectID: hit.objectID,
      dealer_id: hit.dealer_id,
      vin: hit.vin,
      stock: hit.stock ?? hit.stock_number,
      year: hit.year,
      make: hit.make,
      model: hit.model,
      trim: hit.trim,
      price: hit.price,
      msrp: hit.msrp,
      mileage: hit.mileage,
      condition: hit.car_condition,
    })),
  };

  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
