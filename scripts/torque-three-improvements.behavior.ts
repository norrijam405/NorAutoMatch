import assert from "node:assert/strict";
import { combinedCustomerSpec, readRecentCustomerMessages } from "../src/lib/torque-conversation-state";
import { explainTorqueNoMatch } from "../src/lib/torque-no-match";
import { answerTorqueInventory } from "../src/lib/torque-inventory-assistant";
import type { Vehicle } from "../src/lib/inventory";

const base: Vehicle = {
  id: "1N4AA000000000001", year: 2026, make: "Nissan", model: "Rogue", trim: "SV",
  type: "SUV", price: 32000, mileage: 25, drivetrain: "AWD",
  image: "/test.jpg", accent: "Silver", fuelType: "Gasoline"
};

// 1. Show an intelligible, source-grounded reason for the first valid option.
const choice = answerTorqueInventory({
  message: "SUV",
  vehicles: [base], mode: "verified-cache",
  spec: combinedCustomerSpec([], "Nissan SUV")
});
assert.equal(choice.matches.length, 1);
assert.match(choice.answer, /first listed option is 2026 Nissan Rogue SV/i);
assert.match(choice.answer, /body style: suv/i);

// 2. Explain one-store failure without pretending the wider network has none.
const evSpec = combinedCustomerSpec([], "Find me a fully electric Nissan SUV under $30,000");
const noMatch = explainTorqueNoMatch(evSpec, "verified-cache");
assert.match(noMatch, /electric powertrain/);
assert.match(noMatch, /price no higher than \$30,000/);
assert.match(noMatch, /does NOT establish that Orr Auto Group has none/);
assert.doesNotMatch(explainTorqueNoMatch(evSpec, "representative-demo"), /checked dealer catalog/);

// 3. Do not lose an early stated must-have after six follow-up turns.
const turns = [
  "I need a Nissan SUV with AWD",
  "Can I see colors?", "What about the interior?", "Tell me about reliability",
  "How much is tax?", "Is it comfortable?", "What about service?", "How about warranty?",
  "Do they have photos?", "I would like leather"
];
assert.equal(readRecentCustomerMessages(turns).length, 10);
const context = combinedCustomerSpec(turns, "And the price?");
assert.equal(context.make?.value, "Nissan");
assert.equal(context.bodyType?.value, "SUV");
assert.equal(context.drivetrain?.value, "AWD");
assert.equal(context.interiorMaterial?.value, "Leather");
assert.equal(readRecentCustomerMessages(["x".repeat(401), "okay"]).length, 1);
console.log("PASS_TORQUE_THREE_IMPROVEMENT_BATCH");
