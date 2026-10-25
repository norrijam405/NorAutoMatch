import assert from "node:assert/strict";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { buildSaveTheSaleResult } from "../src/lib/save-the-sale";
import type { Vehicle } from "../src/lib/inventory";

const tests: Array<[string, number]> = [
  ["2026 Nissan Rogue under $30,000", 30000],
  ["2026 rogue below $30,000", 30000],
  ["2026 Rogue under 30k", 30000],
  ["2026 Rogue less than $30,000", 30000],
  ["Rogue under $30,000.00", 30000],
  ["Rogue under $29,500", 29500],
];
for (const [request, expected] of tests) {
  const spec = parseTorqueSalesInventorySpec(request);
  assert.equal(spec.maxPrice?.value, expected, request);
}
assert.equal(parseTorqueSalesInventorySpec("under 12,500 miles").maxMileage?.value, 12500);

const rogue: Vehicle = {
  id: "5N1BT3BA0TC123456", year: 2026, make: "Nissan", model: "Rogue",
  trim: "SV", price: 26640, mileage: 10, type: "SUV",
  drivetrain: "FWD", image: "/rogue.jpg", condition: "New",
};
const matches = buildSaveTheSaleResult({
  requirements: parseTorqueSalesInventorySpec("2026 Nissan Rogue under $30,000"),
  vehicles: [rogue],
});
assert.equal(matches.localOptions.length, 1);
assert.equal(matches.localOptions[0].vehicle.id, rogue.id);
const tooHigh = buildSaveTheSaleResult({
  requirements: parseTorqueSalesInventorySpec("2026 Nissan Rogue under $25,000"),
  vehicles: [rogue],
});
assert.equal(tooHigh.localOptions.length, 0);
console.log("PASS_ROGUE_COMMA_PRICE_SEARCH_REGRESSION");
