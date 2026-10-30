import assert from "node:assert/strict";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { buildSaveTheSaleResult } from "../src/lib/save-the-sale";
import type { Vehicle } from "../src/lib/inventory";

const request = "A white V6 truck that has less than 90,000 miles";
const requirements = parseTorqueSalesInventorySpec(request);
assert.equal(requirements.bodyType?.value, "TRUCK");
assert.equal(requirements.engine?.value, "V6");
assert.equal(requirements.exteriorColor?.value, "White");
assert.equal(requirements.maxMileage?.value, 90000);
const base: Vehicle = {
 id: "1N6AA000000000001", year: 2023, make: "Nissan", model: "Frontier",
 trim: "SV", type: "Truck", price: 26000, mileage: 67000,
 drivetrain: "RWD", engine: "3.8L V6", image: "/test.jpg", accent: "White",
 exteriorColor: "White", mileageVerified: true,
};
const stock: Vehicle[] = [
 base,
 {...base, id: "1N6AA000000000002",type: "Sedan", model: "Sentra"},
 {...base, id: "1N6AA000000000003",engine: "2.0L I4"},
 {...base, id: "1N6AA000000000004",engine: ""},
 {...base, id: "1N6AA000000000005",mileage: 99000},
 {...base, id: "1N6AA000000000006",exteriorColor: "Black"},
 {...base, id: "1N6AA000000000007",mileageVerified: false},
];
const result=buildSaveTheSaleResult({requirements,vehicles:stock});
assert.deepEqual(result.localOptions.map(x=>x.vehicle.id), [base.id]);
console.log("PASS_V6_WHITE_TRUCK_STRICT_SEARCH");
