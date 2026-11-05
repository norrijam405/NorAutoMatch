import assert from "node:assert/strict";
import { combinedCustomerSpec, readRecentCustomerMessages, customerSpecSummary } from "../src/lib/torque-conversation-state";

const spec = combinedCustomerSpec([
  "I need an SUV for a family of 7.",
  "It must be fully electric.",
  "I prefer a Nissan and my max is $45,000."
], "What about the mileage?");
assert.equal(spec.bodyType?.value, "SUV");
assert.equal(spec.seatingCapacity?.value, 7);
assert.equal(spec.fuelType?.value, "Electric");
assert.equal(spec.maxPrice?.value, 45000);
assert.equal(spec.make?.value, "Nissan");
assert.ok(customerSpecSummary(spec).includes("7 seats required"));
const changed = combinedCustomerSpec(["I need a truck under $30,000"], "Actually, SUV under $40,000");
assert.equal(changed.bodyType?.value, "SUV");
assert.equal(changed.maxPrice?.value, 40000);
const cleared = combinedCustomerSpec(["Find a fully electric SUV for 7 under $45,000"], "Start over. I want a sedan.");
assert.equal(cleared.bodyType?.value, "SEDAN");
assert.equal(cleared.fuelType, undefined);
assert.equal(cleared.seatingCapacity, undefined);
const sanitized = readRecentCustomerMessages(["good", 14, "", "x".repeat(601), "valid"]);
assert.deepEqual(sanitized, ["good", "valid"]);
assert.deepEqual(readRecentCustomerMessages("not-an-array"), []);
console.log("PASS_TORQUE_EXPLICIT_CONVERSATIONAL_REQUIREMENTS");
