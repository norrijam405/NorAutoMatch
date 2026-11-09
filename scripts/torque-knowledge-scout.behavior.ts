import assert from "node:assert/strict";
import { parseListingMpg, resolveListingMpg, readPublicVehicleDescription } from "../src/lib/torque-dealer-description-scout";
import { scoutEpaModel } from "../src/lib/torque-epa-knowledge-scout";
import { parseExplicitEpaComparison } from "../src/lib/torque-cross-brand-query";
import { observeTorqueDealerCatalog } from "../src/lib/torque-dealer-change-scout";
import { scoutOrrPublicVinDetails } from "../src/lib/torque-orr-vin-detail-scout";
import { isSuvCandidate } from "../src/lib/torque-suv-model-knowledge";
import { rankVehiclesForSalesSpec } from "../src/lib/vehicle-hunt-inventory-matcher";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import type { Vehicle } from "../src/lib/inventory";

assert.deepEqual(parseListingMpg("EPA estimated 28 city / 35 highway MPG"), {
  city: 28, highway: 35, basis: "DEALER_DESCRIPTION",
});
assert.equal(parseListingMpg("28 horsepower and 35,000 miles"), null);
assert.equal(parseListingMpg("28 city 35 highway"), null);
assert.deepEqual(parseListingMpg("City MPG: 28, Highway MPG: 35"),{
  city:28,highway:35,basis:"DEALER_DESCRIPTION",
});
assert.deepEqual(parseListingMpg("City/Highway MPG: 28/35 MPG"),{
  city:28,highway:35,basis:"DEALER_DESCRIPTION",
});
assert.deepEqual(resolveListingMpg({mpg_city:"28",mpg_highway:"35"}), {
  city:28,highway:35,combined:undefined,basis:"DEALER_STRUCTURED",
});
assert.equal(readPublicVehicleDescription({vehicle_description: "<p>Dealer says <b>28 city / 35 highway MPG</b></p>"}),
  "Dealer says 28 city / 35 highway MPG");
assert.deepEqual(resolveListingMpg({
  description: "28 city / 35 highway MPG", city_mpg: 29,
}), {city:29, highway:35, combined:undefined, basis:"DEALER_STRUCTURED"});
assert.equal(resolveListingMpg({ description:"Moonroof, comfortable seats" }), null);

assert.deepEqual(parseExplicitEpaComparison("Compare 2025 Nissan Rogue vs 2025 Toyota RAV4 MPG"), [
  {year:2025,make:"Nissan",model:"Rogue"},
  {year:2025,make:"Toyota",model:"RAV4"},
]);
assert.equal(parseExplicitEpaComparison("Does this VIN have good MPG?").length,0);
// Read-only update scout compares complete snapshots, not user requests.
const listing: Vehicle = {
  id:"1N4AL3AP0GC123456",year:2025,make:"Nissan",model:"Rogue",trim:"SV",
  type:"Sport Utility",price:30500,mileage:12000,mileageVerified:true,
  drivetrain:"FWD",image:"",accent:"",sourceStockStatus:"Active",
};
const baseline = observeTorqueDealerCatalog([listing], "2026-11-09T00:00:00Z");
assert.equal(baseline.state,"BASELINE");
const later = observeTorqueDealerCatalog([{...listing,price:29500,sourceStockStatus:"Pending"}],
  "2026-11-09T00:05:00Z");
assert.equal(later.state,"CHANGES");
assert(later.changes.some(x=>x.kind==="PRICE_CHANGE" && x.before==="30500" && x.after==="29500"));
assert(later.changes.some(x=>x.kind==="STOCK_STATUS_CHANGE"));
assert.equal(observeTorqueDealerCatalog([], "2026-11-09T00:10:00Z").changes.length,0);
assert.equal(observeTorqueDealerCatalog([{...listing,price:29500,sourceStockStatus:"Pending"}],"2026-11-09T00:15:00Z").state,"UNCHANGED");
const stationWagonRogue: Vehicle = {...listing, type:"Station Wagon", condition:"Used"};
assert.equal(isSuvCandidate(stationWagonRogue),true,"Rogue can be categorized Station Wagon in the public dealer feed");
assert.equal(isSuvCandidate({...stationWagonRogue,make:"Volvo",model:"V60"}),false);
const suvFromStationWagon = rankVehiclesForSalesSpec({
  requirements:parseTorqueSalesInventorySpec("I need a Nissan Rogue SUV under $32,000"),
  vehicles:[stationWagonRogue],strictMustHaves:true,
});
assert.equal(suvFromStationWagon.length,1,"SUV family should pass hard SUV identity gate even when dealer says Station Wagon");
assert(suvFromStationWagon[0].reasons.some(x=>/known SUV model family/i.test(x)));



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
    // Realistic but synthetic Orr vehicle page. Same VIN and matching title
    // are mandatory before MPG or equipment become VIN-scoped evidence.
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url=String(input);
      assert(url.startsWith("https://orrnissanwest.com/inventory/Used-2025-Nissan-Rogue-SV-"));
      return new Response("<html><head><title>2025 Nissan Rogue SV at Orr Nissan West</title></head><body>" +
        "VIN: JN8BT3BA7SW011511 Vehicle Specification City MPG 30 Highway MPG 37 " +
        "Features Leather Seats Apple CarPlay Hours Monday 9am</body></html>", {
        status:200,headers:{"Content-Type":"text/html"},
      });
    }) as typeof fetch;
    const detailed = await scoutOrrPublicVinDetails({
      ...stationWagonRogue,id:"JN8BT3BA7SW011511",price:23455,
    });
    assert.equal(detailed.cityMpg,30);
    assert.equal(detailed.highwayMpg,37);
    assert.equal(detailed.mpgEvidenceBasis,"DEALER_DETAIL");
    assert(detailed.features?.includes("Leather Seats"));
    const missingIdentity = await scoutOrrPublicVinDetails({
      ...stationWagonRogue,id:"JN8BT3BA7SW022222",price:23455,
    });
    assert.equal(missingIdentity.cityMpg,undefined,"mismatched page VIN must not enrich a listing");
    process.stdout.write("Torque dealer descriptions and multi-brand EPA knowledge scout PASS\n");
  } finally {
    globalThis.fetch = originalFetch;
  }
}
run().catch(error=>{globalThis.fetch=originalFetch;console.error(error);process.exitCode=1;});
