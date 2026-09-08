import { discoverOrrVehicleUrlsFromHtml, parseOrrVehicleDetailHtml, OrrPublicInventoryError } from "../src/lib/orr-public-inventory";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectParserFailure(fn: () => unknown, code: string) {
  try {
    fn();
    throw new Error(`Expected parser failure ${code}.`);
  } catch (error) {
    assert(error instanceof OrrPublicInventoryError, "Expected OrrPublicInventoryError.");
    assert(error.code === code, `Expected ${code}, received ${error.code}.`);
  }
}

const validUrl = "https://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931";
const validHtml = `
<html><body>
<h1>2026 Nissan Rogue SV</h1>
<div>Stock # 882931</div>
<div>VIN 5N1BT3BA8TC882931</div>
<div>Y'ORR Price $31,500</div>
<div>MSRP $34,000</div>
<div>Mileage 12</div>
<div>Exterior Color Pearl White</div>
<div>Interior Color Charcoal</div>
<div>Drivetrain FWD</div>
<div>Transmission CVT</div>
<div>Engine 1.5L Turbo</div>
<div>Fuel Type Gasoline</div>
<div>City MPG 30</div>
<div>Highway MPG 37</div>
</body></html>`;

function run() {
  const parsed = parseOrrVehicleDetailHtml({ html: validHtml, sourceUrl: validUrl, fetchedAt: "2026-09-08T17:00:00.000Z" });
  assert(parsed.vin === "5N1BT3BA8TC882931", "VIN parse mismatch.");
  assert(parsed.stockNumber === "882931", "Stock parse mismatch.");
  assert(parsed.year === 2026 && parsed.make === "Nissan" && parsed.model === "Rogue", "Core identity parse mismatch.");
  assert(parsed.price === 31500 && parsed.msrp === 34000, "Price parse mismatch.");

  const discovery = discoverOrrVehicleUrlsFromHtml(`
    <a href="/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931">one</a>
    <a href="https://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931?foo=bar">dup</a>
    <a href="https://evil.example/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931">evil</a>
  `);
  assert(discovery.length === 1, "Discovery should de-duplicate same VIN URL and reject foreign origin.");
  assert(!discovery[0].includes("?"), "Discovery should strip query strings.");

  expectParserFailure(
    () => parseOrrVehicleDetailHtml({ html: "<html><body>No vehicle identity here</body></html>", sourceUrl: "https://orrnissanwest.com/inventory/unknown", fetchedAt: "2026-09-08T17:00:00.000Z" }),
    "PARSE_FAILED",
  );

  expectParserFailure(
    () => parseOrrVehicleDetailHtml({ html: validHtml, sourceUrl: "https://evil.example/inventory/New-2026-Nissan-Rogue-SV-5N1BT3BA8TC882931", fetchedAt: "2026-09-08T17:00:00.000Z" }),
    "URL_NOT_ALLOWED",
  );

  const missingStock = validHtml.replace("Stock # 882931", "Stock unavailable");
  expectParserFailure(
    () => parseOrrVehicleDetailHtml({ html: missingStock, sourceUrl: validUrl, fetchedAt: "2026-09-08T17:00:00.000Z" }),
    "PARSE_FAILED",
  );

  console.log("PASS Orr parser adversarial invariants");
}

run();
