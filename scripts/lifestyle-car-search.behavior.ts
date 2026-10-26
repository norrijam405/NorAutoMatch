import assert from "node:assert/strict";
import { interpretLifestyleSearch, lifestyleCandidates } from "../src/lib/lifestyle-car-search";
import type { Vehicle } from "../src/lib/inventory";
const base: Vehicle = {
 id:"5N1AA000000000001", year:2026, make:"Nissan", model:"Pathfinder", trim:"SV",
 type:"SUV", price:32000, mileage:12, drivetrain:"FWD", image:"/test.jpg", accent:"silver"
};
const stock: Vehicle[] = [
 {...base, id:"5N1AA000000000002", features:["Third row seating"], cityMpg:21,highwayMpg:27},
 {...base, id:"5N1AA000000000003", price:27000,features:[]},
 {...base, id:"5N1AA000000000004", model:"Sentra",type:"Sedan",price:22000,features:[]}
];
const family = interpretLifestyleSearch("I want a third row SUV that is good on gas and affordable");
assert.ok(family?.thirdRow && family?.economy && family?.affordable);
assert.deepEqual(lifestyleCandidates(stock,family).map(x=>x.vehicle.id), ["5N1AA000000000002"]);
const teen = interpretLifestyleSearch("I want a small sedan that is good for a teen driver");
assert.ok(teen?.teen && teen?.small && teen?.sedan);
assert.deepEqual(lifestyleCandidates(stock,teen).map(x=>x.vehicle.model), ["Sentra"]);
assert.equal(interpretLifestyleSearch("2026 Nissan Rogue under $30,000"),null);
console.log("PASS_BROAD_LIFESTYLE_INTENT_WITH_VERIFIED_EVIDENCE");
