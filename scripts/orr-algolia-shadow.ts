import { discoverOrrAlgoliaInventory } from "../src/lib/orr-public-algolia";

async function main() {
  const result = await discoverOrrAlgoliaInventory({ hitsPerPage: 10 });
  const receipt = {
    mode: "SHADOW_READ_ONLY",
    sourceUrl: result.sourceUrl,
    sourceHash: result.sourceHash,
    fetchedAt: result.fetchedAt,
    indexName: result.indexName,
    dealerId: result.dealerId,
    hitCount: result.hits.length,
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

  if (receipt.hitCount === 0) {
    throw new Error("Live shadow query returned zero dealer_id 2175 hits; refusing to claim discovery success.");
  }

  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
