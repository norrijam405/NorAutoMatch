import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildInventoryShadowReceipt } from "../src/lib/inventory-shadow-receipt";
import { discoverOrrAlgoliaInventory } from "../src/lib/orr-public-algolia";

async function main() {
  const discovery = await discoverOrrAlgoliaInventory({ hitsPerPage: 100, maxPages: 10 });
  const receipt = buildInventoryShadowReceipt(discovery);
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  const sha256 = createHash("sha256").update(serialized, "utf8").digest("hex");
  const stamp = receipt.source.fetchedAt.replace(/[:.]/g, "-");
  const dir = path.resolve(process.cwd(), "validation_receipts");
  const file = path.join(dir, `norautomatch_inventory_shadow_${stamp}.json`);
  await mkdir(dir, { recursive: true });
  await writeFile(file, serialized, { encoding: "utf8", flag: "wx" });

  console.log(`SHADOW_GATE=${receipt.gate.status}`);
  console.log(`RAW_HITS=${receipt.source.rawHitCount}`);
  console.log(`NORMALIZED=${receipt.normalization.normalizedCount}`);
  console.log(`ELIGIBLE=${receipt.normalization.eligibleCount}`);
  console.log(`WARNINGS=${receipt.normalization.warningCount}`);
  console.log(`ERRORS=${receipt.normalization.errorCount}`);
  console.log(`RECEIPT_PATH=${file}`);
  console.log(`RECEIPT_SHA256=${sha256}`);
  console.log("CUSTOMER_VISIBLE_LIVE_INVENTORY=false");
  console.log("AUTHORITY_EFFECT=NONE");

  if (receipt.gate.status !== "PASS") {
    console.error(`SHADOW_REASONS=${receipt.gate.reasons.join(",")}`);
    process.exitCode = 1;
    return;
  }

  console.log("PASS_NORAUTO_INVENTORY_SHADOW_OBSERVATION");
}

main().catch((error) => {
  console.error("FAIL_NORAUTO_INVENTORY_SHADOW_OBSERVATION");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
