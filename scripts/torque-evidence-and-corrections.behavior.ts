import assert from "node:assert/strict";
import { combinedCustomerSpec } from "../src/lib/torque-conversation-state";
import { vehicleEvidenceForMatch } from "../src/lib/torque-vehicle-evidence";
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
const corrected = combinedCustomerSpec(previous, "I don't need heated seats or sunroof");
assert.equal(corrected.drivetrain?.value, "AWD");
assert(!corrected.features.some(x => /heated seats|sunroof/i.test(x.value)));
const replaced = combinedCustomerSpec(["I need an AWD Rogue"], "I want FWD instead");
assert.equal(replaced.drivetrain?.value, "FWD");
process.stdout.write("Torque VIN evidence and customer corrections synthetic tests PASS\n");
