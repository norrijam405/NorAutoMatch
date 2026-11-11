import assert from "node:assert/strict";
import { combinedCustomerSpec, customerSpecSummary } from "../src/lib/torque-conversation-state";
import { vehicleEvidenceForMatch } from "../src/lib/torque-vehicle-evidence";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { answerTorqueInventory } from "../src/lib/torque-inventory-assistant";
import { rankVehiclesForSalesSpec } from "../src/lib/vehicle-hunt-inventory-matcher";
import { buildTorqueChoiceGuide } from "../src/lib/torque-choice-explainer";
import { inventory as sampleInventory } from "../src/lib/inventory";
import { canUseTorquePreviewVerifiedCatalog } from "../src/lib/torque-standalone-demo";
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
// Equipment truth: a trim name, ambiguous leatherette, or freeform text
// never certifies genuine leather seats or any fitted equipment.
const leatherNeed = parseTorqueSalesInventorySpec("Used SUV under $30,000 with leather seats");
const fakeLeatherTrim: Vehicle = {
  ...car, id: "1N4AL3AP0GC567890", trim: "Leather Edition", condition: "USED",
  mileage: 5000, mileageVerified: true, price: 24900, features: ["heated seats"],
};
const syntheticLeather: Vehicle = {
  ...car, id: "1N4AL3AP0GC456789", trim: "SL", condition: "USED",
  mileage: 5000, mileageVerified: true, price: 25900, features: ["leatherette seats"],
};
const dealerListedLeather: Vehicle = {
  ...car, id: "1N4AL3AP0GC345678", trim: "SV", condition: "USED",
  mileage: 4500, mileageVerified: true, price: 26900,
  features: ["genuine leather seating", "heated seats", "panoramic roof"],
};
const strictLeather = rankVehiclesForSalesSpec({
  requirements: leatherNeed, vehicles: [fakeLeatherTrim, syntheticLeather, dealerListedLeather],
  strictMustHaves: true,
});
assert.deepEqual(strictLeather.map(x => x.vehicle.id), [dealerListedLeather.id],
  "trim and synthetic leather must not satisfy genuine leather seating");
const nearLeather = rankVehiclesForSalesSpec({
  requirements: leatherNeed, vehicles: [fakeLeatherTrim, syntheticLeather],
  strictMustHaves: false,
});
assert(nearLeather.every(x => x.hardMisses > 0));
assert(nearLeather.every(x => x.compromises.some(y => /VIN-listed equipment evidence/.test(y))));
const firstMatch: TorqueVehicleMatch = {
  ...match, id: dealerListedLeather.id, label: "2025 Nissan Rogue SV",
  price: dealerListedLeather.price, mileage: dealerListedLeather.mileage,
  mileageVerified: true,
  reasons: ["dealer-listed interior material: Leather"], compromises: [],
};
const secondMatch: TorqueVehicleMatch = {
  ...match, id: fakeLeatherTrim.id, label: "2025 Nissan Rogue Leather Edition",
  price: fakeLeatherTrim.price, mileage: fakeLeatherTrim.mileage,
  mileageVerified: true,
  reasons: ["price within limit"], compromises: ["leather unverified"],
};
const choices = buildTorqueChoiceGuide({
  matches: [firstMatch, secondMatch],
  vehicles: [dealerListedLeather, fakeLeatherTrim],
  mode: "verified-live",
});
assert(choices);
assert.equal(choices.vehicles.length, 2);
assert(choices.comparisons.some(line => /lower listed price/.test(line)));
assert(choices.comparisons.some(line => /fewer source-reported miles/.test(line)));
assert(choices.comparisons.some(line => /MPG pair is unavailable/.test(line)));
assert(choices.vehicles[1].gaps.some(x => /leather unverified/.test(x)));
assert.equal(buildTorqueChoiceGuide({
  matches: [firstMatch, secondMatch], vehicles: [dealerListedLeather, fakeLeatherTrim],
  mode: "representative-demo",
}), null);
assert.equal(buildTorqueChoiceGuide({
  matches: [firstMatch, secondMatch], vehicles: [dealerListedLeather],
  mode: "verified-live",
}), null);
const unverifiedMileageChoice = buildTorqueChoiceGuide({
  matches: [firstMatch, {...secondMatch, mileageVerified:false}],
  vehicles: [dealerListedLeather, {...fakeLeatherTrim, mileageVerified:false}],
  mode: "verified-live",
});
assert(unverifiedMileageChoice?.comparisons.some(line=>/mileage comparison is not available/.test(line)));

// Video regression: a mileage threshold must not overwrite a price cap.
const recordedQuestion = "I need a midsize SUV with less than 40,000 miles and no more than $32,000";
const recordedSpec = parseTorqueSalesInventorySpec(recordedQuestion);
assert.equal(recordedSpec.maxMileage?.value, 40000, "40,000 is a mileage ceiling");
assert.equal(recordedSpec.maxPrice?.value, 32000, "$32,000 is the price ceiling");
assert.equal(parseTorqueSalesInventorySpec("Looking for an SUV less than 40,000 miles").maxPrice, undefined);
assert.equal(parseTorqueSalesInventorySpec("SUV under $32,000 with leather seats").maxPrice?.value, 32000);
assert.equal(parseTorqueSalesInventorySpec("SUV less than 35,000 miles and below $31,000").maxPrice?.value, 31000);
// The public dealer feed may describe SUVs as "Sport Utility", not "SUV".
const sourceStyleSUV: Vehicle = { ...car, id: "1N4AL3AP0GC012345", type: "Sport Utility", mileage: 3000,
  mileageVerified: true, price: 30533, features: [], };
const sourceAnswer = answerTorqueInventory({
  message: recordedQuestion, vehicles: [sourceStyleSUV],
  mode: "verified-live", spec: recordedSpec,
});
assert.equal(sourceAnswer.matches.length, 1, "source-labeled SUV must remain eligible");
assert.equal(sourceAnswer.matches[0].id, sourceStyleSUV.id);
assert(sourceAnswer.matches[0].price <= 32000);
assert(sourceAnswer.matches[0].mileage <= 40000);
assert.equal(sourceAnswer.matches[0].fit, "near", "midsize must not be inferred");

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
// Read-only source option must never activate from a single switch. All
// preview safety gates must be present simultaneously.
const envKeys = ["NORAUTO_TORQUE_STANDALONE_DEMO", "NORAUTO_INVENTORY_MODE",
  "NORAUTO_SKIP_CRM_MIGRATIONS", "NORAUTO_TORQUE_PREVIEW_VERIFIED_READ_ONLY"] as const;
const priorEnv = envKeys.map(key => process.env[key]);
try {
  process.env.NORAUTO_TORQUE_STANDALONE_DEMO = "1";
  process.env.NORAUTO_INVENTORY_MODE = "demo";
  process.env.NORAUTO_SKIP_CRM_MIGRATIONS = "1";
  process.env.NORAUTO_TORQUE_PREVIEW_VERIFIED_READ_ONLY = "1";
  assert.equal(canUseTorquePreviewVerifiedCatalog(), true);
  process.env.NORAUTO_INVENTORY_MODE = "live-enabled";
  assert.equal(canUseTorquePreviewVerifiedCatalog(), false);
  process.env.NORAUTO_INVENTORY_MODE = "demo";
  process.env.NORAUTO_SKIP_CRM_MIGRATIONS = "0";
  assert.equal(canUseTorquePreviewVerifiedCatalog(), false);
  process.env.NORAUTO_SKIP_CRM_MIGRATIONS = "1";
  process.env.NORAUTO_TORQUE_PREVIEW_VERIFIED_READ_ONLY = "0";
  assert.equal(canUseTorquePreviewVerifiedCatalog(), false);
} finally {
  envKeys.forEach((key, index) => {
    const previous = priorEnv[index];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
}
process.stdout.write("Torque VIN evidence and customer corrections synthetic tests PASS\n");
