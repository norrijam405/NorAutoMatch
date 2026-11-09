import assert from "node:assert/strict";
import { combinedCustomerSpec, customerSpecSummary } from "../src/lib/torque-conversation-state";
import { vehicleEvidenceForMatch } from "../src/lib/torque-vehicle-evidence";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { answerTorqueInventory } from "../src/lib/torque-inventory-assistant";
import { inventory as sampleInventory } from "../src/lib/inventory";
import { chooseTorqueBattlePair } from "../src/lib/torque-battle-candidates";
import type { Vehicle } from "../src/lib/inventory";
import type { TorqueVehicleMatch } from "../src/lib/torque-inventory-assistant";

// Synthetic only. Do not connect dealer providers or communicate with customers.
const car: Vehicle = {
  id: "1N4AL3AP0GC123456", year: 2025, make: "Nissan", model: "Rogue",
  trim: "SV", price: 27000, mileage: 0, mileageVerified: false,
  type: "SUV", drivetrain: "AWD", image: "", accent: "",
  features: ["heated seats"], stockNumber: "TEST123",
};
const match: TorqueVehicleMatch = {
  id: car.id, label: "2025 Nissan Rogue SV", price: car.price,
  mileage: car.mileage, mileageVerified: car.mileageVerified,
  type: car.type, drivetrain: car.drivetrain,
  fit: "near", reasons: ["AWD"], compromises: ["third row not verified"],
};
const report = vehicleEvidenceForMatch(match, [car], "verified-cache");
assert(report);
assert.equal(report.identity, "VIN");
assert.equal(report.stockNumber, "TEST123");
assert.equal(report.mileage.state, "UNVERIFIED");
assert.equal(report.mileage.value, null);
assert(report.unknowns.some(x => x.includes("third row")));
assert(report.unknowns.some(x => x.includes("availability")));
assert.equal(vehicleEvidenceForMatch(match, [], "verified-live"), null);

const previous = ["I need an AWD Rogue with heated seats and sunroof"];
const corrected = combinedCustomerSpec([...previous, "I don't need heated seats"], "I don't need sunroof");
assert.equal(corrected.drivetrain?.value, "AWD");
assert(customerSpecSummary(corrected).includes("AWD"));
assert(!customerSpecSummary(corrected).some(x => /heated seats|sunroof/i.test(x)));
assert(!corrected.features.some(x => /heated seats|sunroof/i.test(x.value)));
const multiWithdrawal = combinedCustomerSpec(previous, "I don't need heated seats or sunroof anymore");
assert.equal(multiWithdrawal.drivetrain?.value, "AWD");
assert(!multiWithdrawal.features.some(x => /heated seats|sunroof/i.test(x.value)));
const contrasting = combinedCustomerSpec(previous, "I don't need heated seats but I still need sunroof");
assert(!contrasting.features.some(x => /heated seats/i.test(x.value)));
assert(contrasting.features.some(x => /sunroof/i.test(x.value)));
const replaced = combinedCustomerSpec(["I need an AWD Rogue"], "I want FWD instead");
assert.equal(replaced.drivetrain?.value, "FWD");
const secondVin = "1N4AL3AP0GC654321";
assert.deepEqual(chooseTorqueBattlePair("verified-live", [{id: car.id}, {id: secondVin}]), [car.id, secondVin]);
assert.deepEqual(chooseTorqueBattlePair("verified-cache", [{id: car.id.toLowerCase()}, {id: secondVin}]), [car.id, secondVin]);
assert.equal(chooseTorqueBattlePair("representative-demo", [{id: car.id}, {id: secondVin}]), null);
assert.equal(chooseTorqueBattlePair("verified-live", [{id: car.id}, {id: car.id.toLowerCase()}]), null);
assert.equal(chooseTorqueBattlePair("verified-live", [{id: "rogue-demo"}, {id: car.id}]), null);
assert.equal(chooseTorqueBattlePair("verified-live", [{id: car.id}]), null);
// Exact customer-style regression: source records must be referenced even if
// leather, midsize category and MPG are unverified. No fake dealership VIN.
const shopperMessage = "I want a mid-size SUV good on gas for less than $32,000 with leather seats";
const shopperSpec = parseTorqueSalesInventorySpec(shopperMessage);
assert.equal(shopperSpec.bodyType?.value, "SUV");
assert.equal(shopperSpec.maxPrice?.value, 32000);
assert.equal(shopperSpec.interiorMaterial?.value, "Leather");
assert(!shopperSpec.features.some(x => /leather/i.test(x.value)), "do not double-count leather");
assert(shopperSpec.freeformNotes.some(x => x.startsWith("Midsize SUV requested")));
const shopperAnswer = answerTorqueInventory({
  message: shopperMessage, vehicles: sampleInventory, mode: "representative-demo", spec: shopperSpec,
});
assert(shopperAnswer.matches.length > 0, "return visibly qualified sample SUV candidates");
assert(shopperAnswer.matches.every(x => x.fit === "near"));
assert(shopperAnswer.matches.every(x => x.price <= 32000 && x.type === "SUV"));
assert(shopperAnswer.matches.some(x => x.compromises.some(y => /leather|interior material/i.test(y))));
assert(shopperAnswer.matches.every(x => x.compromises.some(y => /fuel economy not established/i.test(y))));
assert.match(shopperAnswer.answer, /SAMPLE|sample/);
assert.match(shopperAnswer.answer, /midsize/i);
process.stdout.write("Torque VIN evidence and customer corrections synthetic tests PASS\n");
