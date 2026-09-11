import assert from "node:assert/strict";
import { findRestrictedIntakeData } from "../src/lib/restricted-intake-data";

function reasons(value: Parameters<typeof findRestrictedIntakeData>[0]) {
  return findRestrictedIntakeData(value).map((finding) => `${finding.field}:${finding.reason}`).sort();
}

assert.deepEqual(
  reasons({ notes: "My SSN is 123-45-6789" }),
  ["notes:SSN_LIKE_VALUE"],
  "SSN-shaped values must be rejected",
);

assert.deepEqual(
  reasons({ notes: "Use card 4111 1111 1111 1111" }),
  ["notes:PAYMENT_CARD_LIKE_VALUE"],
  "Luhn-valid payment-card-like values must be rejected",
);

assert.deepEqual(
  reasons({ notes: "routing number 123456789" }),
  ["notes:BANK_ROUTING_LIKE_VALUE"],
  "routing-number-labeled nine-digit values must be rejected",
);

assert.deepEqual(
  reasons({ tradeIn: "bank account number 123456789012" }),
  ["tradeIn:BANK_ACCOUNT_LIKE_VALUE"],
  "bank-account-labeled values must be rejected",
);

assert.deepEqual(
  reasons({ notes: "driver license number ABC12345" }),
  ["notes:DRIVER_LICENSE_LIKE_VALUE"],
  "driver-license-labeled identifiers must be rejected",
);

assert.deepEqual(reasons({ notes: "I do not have a credit card." }), []);
assert.deepEqual(reasons({ notes: "I do not have a driver's license." }), []);
assert.deepEqual(reasons({ notes: "Call me at 405-555-0123 after 5." }), []);
assert.deepEqual(reasons({ tradeIn: "2019 Nissan Altima VIN 1N4BL4DV9SN320880" }), []);
assert.deepEqual(reasons({ notes: "Stock number 320880 and monthly target is 550." }), []);
assert.deepEqual(reasons({ notes: "accounting questions are okay, no account number supplied" }), []);
assert.deepEqual(reasons({ notes: "card ending in 1111 only" }), []);

const multi = reasons({
  notes: "SSN 123 45 6789 and routing 987654321",
  tradeIn: "driver license # ZXCV12345",
});
assert.deepEqual(multi, [
  "notes:BANK_ROUTING_LIKE_VALUE",
  "notes:SSN_LIKE_VALUE",
  "tradeIn:DRIVER_LICENSE_LIKE_VALUE",
]);

console.log("restricted intake data behavior: PASS");
