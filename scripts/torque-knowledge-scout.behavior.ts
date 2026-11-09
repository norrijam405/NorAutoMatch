import assert from "node:assert/strict";
import { parseListingMpg, resolveListingMpg, readPublicVehicleDescription } from "../src/lib/torque-dealer-description-scout";
import { scoutEpaModel } from "../src/lib/torque-epa-knowledge-scout";

assert.deepEqual(parseListingMpg("EPA estimated 28 city / 35 highway MPG"), {
  city: 28, highway: 35, basis: "DEALER_DESCRIPTION",
});
assert.equal(parseListingMpg("28 horsepower and 35,000 miles"), null);
assert.equal(parseListingMpg("28 city 35 highway"), null);
assert.equal(readPublicVehicleDescription({vehicle_description: "<p>Dealer says <b>28 city / 35 highway MPG</b></p>"}),
  "Dealer says 28 city / 35 highway MPG");
assert.deepEqual(resolveListingMpg({
  description: "28 city / 35 highway MPG", city_mpg: 29,
}), {city:29, highway:35, combined:undefined, basis:"DEALER_STRUCTURED"});
assert.equal(resolveListingMpg({ description:"Moonroof, comfortable seats" }), null);

// Synthetic mocked official responses; no real network or VIN assertions.
const originalFetch = globalThis.fetch;
const requested: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  requested.push(url);
  assert(url.startsWith("https://www.fueleconomy.gov/ws/rest/"), "fixed official source host");
  if (url.includes("/menu/options?")) return new Response(JSON.stringify({menuItem:[
    {text:"2WD 4 cyl, 2.5 L, Automatic", value:"12345"},
    {text:"4WD 4 cyl, 2.5 L, Automatic", value:"12346"},
  ]}), {status:200,headers:{"Content-Type":"application/json"}});
  if (url.endsWith("/12345")) return new Response(JSON.stringify({city08:29,highway08:35,comb08:32}),{status:200});
  if (url.endsWith("/12346")) return new Response(JSON.stringify({city08:27,highway08:33,comb08:30}),{status:200});
  throw new Error("unexpected official URL " + url);
}) as typeof fetch;
async function run() {
  try {
    const report = await scoutEpaModel({year:2026,make:"Toyota",model:"RAV4"});
    assert.equal(report.source, "EPA_FUELECONOMY_GOV");
    assert.equal(report.status, "MODEL_VARIANTS");
    assert.equal(report.variants.length, 2);
    assert.deepEqual(report.variants.map(x=>x.highwayMpg),[35,33]);
    assert(report.variants.every(x=>x.sourceUrl.startsWith("https://www.fueleconomy.gov/feg/noframes/")));
    assert.match(report.note,/NOT automatically to a dealer VIN/);
    const priorCount = requested.length;
    const again = await scoutEpaModel({year:2026,make:"Toyota",model:"RAV4"});
    assert.equal(again.variants.length,2);
    assert.equal(requested.length,priorCount,"cache prevents repeated EPA requests");
    const invalid = await scoutEpaModel({year:2026,make:"https://evil.test",model:"RAV4"});
    assert.equal(invalid.status,"NOT_FOUND");
    assert.equal(requested.length,priorCount,"bad make cannot fetch arbitrary URLs");
    process.stdout.write("Torque dealer descriptions and multi-brand EPA knowledge scout PASS\n");
  } finally {
    globalThis.fetch = originalFetch;
  }
}
run().catch(error=>{globalThis.fetch=originalFetch;console.error(error);process.exitCode=1;});
