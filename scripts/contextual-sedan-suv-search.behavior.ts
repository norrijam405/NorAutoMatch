import assert from "node:assert/strict";
import { interpretLifestyleSearch, lifestyleCandidates } from "../src/lib/lifestyle-car-search";
import type { Vehicle } from "../src/lib/inventory";
const query = "What would be good if you are coming from a small sedan but want something just as good with fuel economy, also could be an SUV, but looking for something that is no more than $29,800.";
const intent = interpretLifestyleSearch(query);
assert.ok(intent);
assert.equal(intent.sedan, false, "Previous sedan is context, not a new-car requirement");
assert.equal(intent.suv, true);
assert.equal(intent.maxPrice, 29800);
const base: Vehicle = {id:"1N1AA000000000001",year:2025,make:"Nissan",model:"Kicks",trim:"SV",price:25500,type:"SUV",mileage:4,drivetrain:"FWD",image:"/car.jpg",accent:"Blue"};
const stock: Vehicle[] = [
 {...base,cityMpg:28,highwayMpg:35},
 {...base,id:"1N1AA000000000002",price:32000,cityMpg:30,highwayMpg:38},
 {...base,id:"1N1AA000000000003",type:"Sedan",price:20000},
];
assert.deepEqual(lifestyleCandidates(stock,intent).map(x=>x.vehicle.id),[base.id]);
console.log("PASS_REAL_CUSTOMER_CONTEXTUAL_SEDAN_SUV_BUDGET");
