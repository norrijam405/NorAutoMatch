import assert from "node:assert/strict";
import type { Vehicle } from "../src/lib/inventory";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { rankVehiclesForSalesSpec } from "../src/lib/vehicle-hunt-inventory-matcher";
import { answerTorqueInventory } from "../src/lib/torque-inventory-assistant";
const base: Vehicle = {
  id:"1N4AA000000000001",year:2026,make:"Nissan",model:"Rogue",trim:"SV",
  type:"SUV",price:32000,mileage:100,drivetrain:"FWD",image:"/a.jpg",accent:"Gray",fuelType:"Gasoline"
};
const stock: Vehicle[] = [
  base,
  {...base,id:"1N4AA000000000002",price:43000,drivetrain:"AWD"},
  {...base,id:"1N4AA000000000003",model:"Ariya",fuelType:"Electric",price:35000},
];
const spec = parseTorqueSalesInventorySpec("Find a fully electric Nissan SUV under $30,000");
const strict = rankVehiclesForSalesSpec({requirements:spec,vehicles:stock,strictMustHaves:true});
assert.equal(strict.length,0,"A cheaper gasoline SUV must not be presented as an electric match");
const loose = rankVehiclesForSalesSpec({requirements:spec,vehicles:stock});
assert.ok(loose.length>=1,"Other sourcing workflows retain their own near-match semantics");
const answer = answerTorqueInventory({message:"Find a fully electric Nissan SUV under $30,000",vehicles:stock,mode:"verified-cache",spec});
assert.equal(answer.matches.length,0,"Torque must not suggest vehicles violating any hard requirement");
assert.equal(answer.exactCount,0);
assert.equal(answer.handoff.required,true);
const awd = parseTorqueSalesInventorySpec("Nissan Rogue AWD under $35,000");
const onlyFwd = answerTorqueInventory({message:"Nissan Rogue AWD under $35,000",vehicles:[base],mode:"verified-live",spec:awd});
assert.equal(onlyFwd.matches.length,0,"FWD stock is not a substitute for hard AWD");
console.log("PASS_TORQUE_NO_MUST_HAVE_COMPROMISES");
