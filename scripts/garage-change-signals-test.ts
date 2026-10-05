import { strict as assert } from "node:assert";
import { buildGarageChangeSignals } from "../src/lib/garage-change-signals";

const signals = buildGarageChangeSignals(
  [
    { vin: "1N4BL4DV9SN320880", price: 20970, mileage: 40000, created_at: "2026-09-15T12:00:00Z" },
    { vin: "1N4BL4DV9SN320880", price: 19970, mileage: 40776, created_at: "2026-09-16T12:00:00Z" },
    { vin: "3N8AP6CB1VL303920", price: 25000, mileage: 10, created_at: "2026-09-16T12:00:00Z" },
  ],
  [
    { vin: "1N4BL4DV9SN320880", price: 18970, mileage: 40900 },
  ],
);

const altima = signals.get("1N4BL4DV9SN320880");
assert.ok(altima);
assert.equal(altima.currentInventoryPresent, true);
assert.equal(altima.priceDelta, -1000);
assert.equal(altima.mileageDelta, 124);
assert.equal(altima.savedAt, "2026-09-16T12:00:00Z");

const kicks = signals.get("3N8AP6CB1VL303920");
assert.ok(kicks);
assert.equal(kicks.currentInventoryPresent, false);
assert.equal(kicks.priceDelta, null);
assert.equal(kicks.mileageDelta, null);

console.log("garage-change-signals deterministic proof: PASS");
