import assert from "node:assert/strict";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { rankVehiclesForSalesSpec } from "../src/lib/vehicle-hunt-inventory-matcher";
import type { Vehicle } from "../src/lib/inventory";

const request = "I want a full EV Nissan SUV that can fit a family of 7. Color and drivetrain do not matter.";
const spec = parseTorqueSalesInventorySpec(request);
assert.equal(spec.make?.value, "Nissan");
assert.equal(spec.bodyType?.value, "SUV");
assert.equal(spec.fuelType?.value, "Electric");
assert.equal(spec.seatingCapacity?.value, 7);
const v: Vehicle = {
  id:"1N4AA000000000001",year:2025,make:"Nissan",model:"Titan",trim:"SV",
  price:25000,type:"Truck",mileage:15000,drivetrain:"4WD",image:"/test.jpg",accent:"White",
  fuelType:"Gasoline"
};
const inventory = [
  v,
  {...v,id:"1N4AA000000000002",model:"Frontier",type:"Truck"},
  {...v,id:"1N4AA000000000003",model:"Ariya",type:"SUV",fuelType:"Electric"}
];
assert.deepEqual(rankVehiclesForSalesSpec({requirements:spec,vehicles:inventory}),[],
  "With no VIN-level seating evidence, do not label ANY truck or EV as a verified 7-seat fit");
const loose = parseTorqueSalesInventorySpec("Nissan SUV");
assert.deepEqual(rankVehiclesForSalesSpec({requirements:loose,vehicles:inventory}).map(x=>x.vehicle.id),
  [inventory[2].id],"A Nissan SUV request must not return pickups");
console.log("PASS_NO_FALSE_SEVEN_PASSENGER_EV_EXACT_MATCH");
