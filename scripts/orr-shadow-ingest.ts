import { discoverOrrPublicInventory, fetchOrrPublicVehicle } from "../src/lib/orr-public-inventory";

async function main() {
  const discovery = await discoverOrrPublicInventory({ timeoutMs: 8000, maxBytes: 5 * 1024 * 1024 });
  const sampleUrls = discovery.vehicleUrls.slice(0, 10);
  const records = [];
  const issues = [];

  for (const sourceUrl of sampleUrls) {
    try {
      const record = await fetchOrrPublicVehicle(sourceUrl, { timeoutMs: 8000, maxBytes: 5 * 1024 * 1024 });
      records.push({
        vin: record.vin,
        stockNumber: record.stockNumber,
        year: record.year,
        make: record.make,
        model: record.model,
        trim: record.trim,
        price: record.price,
        msrp: record.msrp,
        mileage: record.mileage,
        sourceUrl: record.sourceUrl,
        sourceHash: record.sourceHash,
        parserVersion: record.parserVersion,
      });
    } catch (error) {
      issues.push({ sourceUrl, message: error instanceof Error ? error.message : "Unknown shadow-ingest error" });
    }
  }

  console.log(JSON.stringify({
    mode: "SHADOW_READ_ONLY",
    discoverySourceUrl: discovery.sourceUrl,
    discoveryHash: discovery.sourceHash,
    discoveredVehicleCount: discovery.vehicleUrls.length,
    sampledVehicleCount: sampleUrls.length,
    parsedVehicleCount: records.length,
    issueCount: issues.length,
    records,
    issues,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
