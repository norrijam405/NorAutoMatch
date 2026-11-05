import assert from "node:assert/strict";
import type { Vehicle } from "../src/lib/inventory";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { combinedCustomerSpec } from "../src/lib/torque-conversation-state";
import { torqueNextQuestion } from "../src/lib/torque-next-question";
import { rankVehiclesForSalesSpec } from "../src/lib/vehicle-hunt-inventory-matcher";

const base: Vehicle = { id:"1N4AA000000000001",year:2025,make:"Nissan",
  model:"Rogue",trim:"SV",type:"SUV",price:25000,mileage:12,drivetrain:"FWD",image:"/a.jpg",accent:"White" };
const stock: Vehicle[] = [
  base,
  {...base,id:"1N4AA000000000002",make:"Toyota",model:"Sienna",type:"Minivan"},
  {...base,id:"1N4AA000000000003",make:"Nissan",model:"Frontier",type:"Truck"},
];
const seatsOnly = parseTorqueSalesInventorySpec("We have a family of 7");
assert.match(torqueNextQuestion(seatsOnly) ?? "",/SUV or open to a minivan/);
const flexible = combinedCustomerSpec(["I have a family of 7"],"Either SUV or minivan works");
assert.equal(flexible.bodyType,undefined);
assert.deepEqual(flexible.bodyTypeAlternatives?.value,["SUV","MINIVAN"]);
assert.equal(torqueNextQuestion(flexible),null);
const matches=rankVehiclesForSalesSpec({requirements:parseTorqueSalesInventorySpec("SUV or minivan"),vehicles:stock,strictMustHaves:true});
assert.deepEqual(matches.map(x=>x.vehicle.id).sort(),[stock[0].id,stock[1].id].sort());
const onlyVan = combinedCustomerSpec(["SUV or minivan"],"Actually, I only want a minivan");
assert.equal(onlyVan.bodyType?.value,"MINIVAN");
assert.equal(onlyVan.bodyTypeAlternatives,undefined);
const onlySuv = combinedCustomerSpec(["I need a minivan"],"Actually, an SUV");
assert.equal(onlySuv.bodyType?.value,"SUV");
assert.equal(onlySuv.bodyTypeAlternatives,undefined);
assert.equal(parseTorqueSalesInventorySpec("minivan").bodyType?.value,"MINIVAN");
console.log("PASS_TORQUE_FLEXIBLE_BODY_STYLE_AND_CLARIFICATIONS");
