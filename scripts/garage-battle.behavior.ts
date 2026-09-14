import assert from "node:assert/strict";
import { buildGarageBattleStory } from "../src/lib/garage-battle";
import type { Vehicle } from "../src/lib/inventory";

function vehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: "VIN-BASE",
    year: 2026,
    make: "Nissan",
    model: "Rogue",
    trim: "SV",
    price: 32_000,
    type: "SUV",
    mileage: 10,
    drivetrain: "AWD",
    image: "/vehicle.jpg",
    accent: "Gun Metallic",
    exteriorColor: "Gun Metallic",
    cityMpg: 28,
    highwayMpg: 35,
    ...overrides,
  };
}

{
  const rogue = vehicle({ id: "ROGUE", model: "Rogue", price: 32_000, drivetrain: "AWD", cityMpg: 28, highwayMpg: 35 });
  const kicks = vehicle({ id: "KICKS", model: "Kicks", trim: "SV", price: 26_000, drivetrain: "FWD", cityMpg: 28, highwayMpg: 35 });
  const story = buildGarageBattleStory(rogue, kicks);

  assert.equal(story.headline, "2026 Nissan Rogue vs 2026 Nissan Kicks: which fits your life?");
  assert.ok(story.decisionPrompt.includes("does not declare a universal winner"));

  const cargo = story.signals.find((signal) => signal.id === "cargo");
  assert.ok(cargo);
  assert.equal(cargo?.vehicleId, "ROGUE");
  assert.ok(cargo?.text.includes("36.3–36.5 cu. ft."));
  assert.ok(cargo?.text.includes("23.9–30 cu. ft."));
  assert.ok(cargo?.evidence.every((entry) => entry.source === "manufacturer-spec"));

  const parking = story.signals.find((signal) => signal.id === "footprint");
  assert.ok(parking);
  assert.equal(parking?.vehicleId, "KICKS");
  assert.ok(parking?.text.includes("11.1 inches shorter"));

  const price = story.signals.find((signal) => signal.id === "advertised-price");
  assert.ok(price);
  assert.equal(price?.vehicleId, "KICKS");
  assert.ok(price?.text.includes("advertised $6,000 lower"));
  assert.ok(price?.text.includes("not a payment, approval, out-the-door quote"));

  const traction = story.signals.find((signal) => signal.id === "traction");
  assert.ok(traction);
  assert.equal(traction?.vehicleId, "ROGUE");
  assert.ok(traction?.evidence.every((entry) => entry.source === "dealer-inventory"));
}

{
  const unknownA = vehicle({ id: "A", year: 2024, make: "Other", model: "Alpha", price: 20_000, cityMpg: undefined, highwayMpg: undefined });
  const unknownB = vehicle({ id: "B", year: 2024, make: "Other", model: "Beta", price: 21_000, cityMpg: undefined, highwayMpg: undefined });
  const story = buildGarageBattleStory(unknownA, unknownB);

  assert.ok(!story.signals.some((signal) => signal.id === "cargo"));
  assert.ok(!story.signals.some((signal) => signal.id === "footprint"));
  assert.ok(story.evidenceGaps.some((gap) => gap.includes("withheld unless both vehicles have exact model-year")));
  assert.ok(story.evidenceGaps.some((gap) => gap.includes("Fuel-economy comparison is incomplete")));
  assert.ok(!JSON.stringify(story).toLowerCase().includes("universal winner:"));
}

{
  const rogue = vehicle({ id: "R25", year: 2025, model: "Rogue", cityMpg: 27, highwayMpg: 34 });
  const kicks = vehicle({ id: "K25", year: 2025, model: "Kicks", drivetrain: "FWD", cityMpg: 28, highwayMpg: 35 });
  const story = buildGarageBattleStory(rogue, kicks);
  assert.equal(story.signals.find((signal) => signal.id === "cargo")?.vehicleId, "R25");
  assert.equal(story.signals.find((signal) => signal.id === "city-mpg")?.vehicleId, "K25");
  assert.equal(story.signals.find((signal) => signal.id === "highway-mpg")?.vehicleId, "K25");
}

console.log("PASS_GARAGE_BATTLE_EVIDENCE_BOUNDARIES");
