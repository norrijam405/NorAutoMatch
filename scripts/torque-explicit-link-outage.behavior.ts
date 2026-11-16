import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { explicitOrrListing, checkExplicitOrrListing } from "../src/lib/torque-official-listing-link";

// Source-order canary: the customer-supplied link must be handled before
// the resilient aggregate dealer feed, including its fail-closed 503 path.
const route = readFileSync("src/app/api/torque/search/route.ts", "utf8");
const priority = route.indexOf("const customerLink = previewVerified ? explicitOrrListing(message)");
const catalog = route.indexOf("await loadOrrResilientCustomerCatalog(");
assert(priority >= 0 && catalog > priority, "exact VIN must precede dealer catalog fetch");
assert(route.indexOf("if (customerLink)", priority) < catalog, "link branch must finish before catalog fetch");
assert(route.includes("customerRequirements: customerSpecSummary(spec)"), "retain shopping brief on link path");

const vin = "5N1BT3BAXTC868156"; // Customer-provided VIN-format fixture; not proof of live stock.
const link = "https://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-Dark_Armor-" + vin;
const parsed = explicitOrrListing("Please check this exact one: " + link);
assert(parsed);
assert.equal(parsed.vin, vin);
assert.equal(parsed.url, link);
assert.match(parsed.title, /Rogue Dark Armor/);
assert(explicitOrrListing("https://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-Dark-Armor-" + vin));
for (const untrusted of [
  "http://orrnissanwest.com/inventory/New-2026-Nissan-Rogue-Dark_Armor-" + vin,
  "https://orrnissanwest.com.evil.test/inventory/New-2026-Nissan-Rogue-Dark_Armor-" + vin,
  "https://evil.test/inventory/New-2026-Nissan-Rogue-Dark_Armor-" + vin,
  "https://orrnissanwest.com@evil.test/inventory/New-2026-Nissan-Rogue-Dark_Armor-" + vin,
  link + "?token=private",
  link.replace(vin, "not-a-vin"),
]) assert.equal(explicitOrrListing(untrusted), null, "reject untrusted URL");

const originalFetch = globalThis.fetch;
let calls = 0;
try {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), link, "no customer URL host or path substitution");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    return new Response(
      "<html><head><title>New 2026 Nissan Rogue Dark Armor | Orr Nissan West</title></head>" +
      "<body>Fictional dealership fixture. VIN " + vin + "</body></html>",
      {status:200, headers:{"content-type":"text/html"}},
    );
  }) as typeof fetch;
  assert.equal(await checkExplicitOrrListing(link, vin), "PAGE_VERIFIED");
  const callsBeforeInvalid = calls;
  assert.equal(await checkExplicitOrrListing("https://evil.test/" + vin, vin), "PAGE_NOT_VERIFIED");
  assert.equal(await checkExplicitOrrListing(link, "JN8BT3BA7SW011511"), "PAGE_NOT_VERIFIED");
  assert.equal(calls, callsBeforeInvalid, "invalid inputs must never fetch");
  globalThis.fetch = (async () => new Response(
    "<title>New 2026 Nissan Rogue Dark Armor</title><body>Different VIN JN8BT3BA7SW011511</body>",
    {status:200,headers:{"content-type":"text/html"}},
  )) as typeof fetch;
  assert.equal(await checkExplicitOrrListing(link, vin), "PAGE_NOT_VERIFIED", "wrong VIN fails closed");
  globalThis.fetch = (async () => new Response(
    "<title>Unknown dealer landing page</title><body>Related VIN " + vin + "</body>",
    {status:200,headers:{"content-type":"text/html"}},
  )) as typeof fetch;
  assert.equal(await checkExplicitOrrListing(link, vin), "PAGE_NOT_VERIFIED", "generic page with VIN fails");
  globalThis.fetch = (async () => new Response("blocked", {status:403,headers:{"content-type":"text/html"}})) as typeof fetch;
  assert.equal(await checkExplicitOrrListing(link, vin), "PAGE_NOT_VERIFIED");
  globalThis.fetch = (async () => { throw new Error("synthetic dealer outage"); }) as typeof fetch;
  assert.equal(await checkExplicitOrrListing(link, vin), "PAGE_NOT_VERIFIED", "outage must not invent stock");
} finally {
  globalThis.fetch = originalFetch;
}
process.stdout.write("Torque R27 official VIN link/outage synthetic canaries PASS\n");
