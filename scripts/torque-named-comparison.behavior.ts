import assert from "node:assert/strict";
import type { Vehicle } from "../src/lib/inventory";
import { comparisonRequested, namedComparison } from "../src/lib/torque-conversation-comparison";

const base: Vehicle = { id: "1N4AA000000000001", year: 2026, make: "Nissan", model: "Rogue",
  trim: "SV", price: 31000, type: "SUV", mileage: 6, drivetrain: "AWD", image: "/test.jpg", accent: "Blue" };
const stock: Vehicle[] = [
  base,
  { ...base, id: "1N4AA000000000002", model: "Kicks", price: 26000 },
  { ...base, id: "1N4AA000000000003", year: 2025, model: "Kicks", price: 24000 },
  { ...base, id: "1N4AA000000000004", make: "Toyota", model: "Sienna", price: 38000 },
];
assert.equal(comparisonRequested("Which is better, Rogue or Kicks?"), true);
const pair = namedComparison("Which is better, Rogue or Kicks for my family?", stock);
assert.ok(pair);
assert.deepEqual(pair.vehicles.map(v => v.model), ["Rogue", "Kicks"]);
assert.equal(pair.vehicles[1].year, 2026);
assert.deepEqual(pair.counts, [1, 2]);
assert.equal(namedComparison("Compare the Toyota Sienna versus Nissan Rogue", stock)?.vehicles[0].model, "Sienna");
assert.equal(namedComparison("I want to buy a Rogue", stock), null, "Normal shopping must not trigger comparisons");
assert.equal(namedComparison("Compare Rogue vs Armada", stock), null, "Unknown models must not be invented");
assert.equal(namedComparison("Which vehicle is better?", stock), null, "Do not infer two cars");
assert.equal(namedComparison("Compare Rogue vs Kicks vs Sienna", stock), null, "Do not silently discard a third named model");
console.log("PASS_TORQUE_NAMED_CATALOG_COMPARISONS");
