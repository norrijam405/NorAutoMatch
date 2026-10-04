import assert from "node:assert/strict";
import { parseInventoryQuery, searchInventory } from "../src/lib/inventory-search";
import type { Vehicle } from "../src/lib/inventory";

const vehicles: Vehicle[] = [
  {
    id: "ROGUE-GUN-AWD-CARPLAY",
    year: 2025,
    make: "Nissan",
    model: "Rogue",
    trim: "SV",
    price: 31_500,
    type: "SUV",
    mileage: 12,
    drivetrain: "AWD",
    image: "/rogue.jpg",
    accent: "Gun Metallic",
    exteriorColor: "Gun Metallic",
    condition: "New",
    features: ["Apple CarPlay Integration", "Blind Spot Warning"],
  },
  {
    id: "ROGUE-RED-AWD-NO-CARPLAY",
    year: 2025,
    make: "Nissan",
    model: "Rogue",
    trim: "S",
    price: 29_500,
    type: "SUV",
    mileage: 20,
    drivetrain: "AWD",
    image: "/rogue-red.jpg",
    accent: "Scarlet Ember Tintcoat",
    exteriorColor: "Scarlet Ember Tintcoat",
    condition: "New",
    features: ["Bluetooth Hands-Free Phone System"],
  },
  {
    id: "ROGUE-GUN-FWD-CARPLAY",
    year: 2024,
    make: "Nissan",
    model: "Rogue",
    trim: "SV",
    price: 27_900,
    type: "SUV",
    mileage: 8_000,
    drivetrain: "FWD",
    image: "/rogue-fwd.jpg",
    accent: "Gun Metallic",
    exteriorColor: "Gun Metallic",
    condition: "Used",
    features: ["Apple CarPlay"],
  },
  {
    id: "UNRELATED-RED-HYBRID",
    year: 2025,
    make: "Mitsubishi",
    model: "Outlander PHEV",
    trim: "SE",
    price: 39_900,
    type: "SUV",
    mileage: 9,
    drivetrain: "AWD",
    image: "/outlander.jpg",
    accent: "Red Diamond",
    exteriorColor: "Red Diamond",
    condition: "New",
    features: ["Apple CarPlay"],
  },
  {
    id: "KICKS-CARPLAY",
    year: 2025,
    make: "Nissan",
    model: "Kicks",
    trim: "SV",
    price: 25_000,
    type: "SUV",
    mileage: 10,
    drivetrain: "FWD",
    image: "/kicks.jpg",
    accent: "Super Black",
    exteriorColor: "Super Black",
    condition: "New",
    features: ["Wireless Apple CarPlay Integration"],
  },
];

{
  const parsed = parseInventoryQuery("gun metal rogue", vehicles);
  assert.deepEqual(parsed.constraints.map((constraint) => [constraint.kind, constraint.value]), [
    ["model", "rogue"],
    ["color", "gun-metallic"],
  ]);
  const result = searchInventory(vehicles, "gun metal rogue");
  assert.equal(result.exact[0]?.vehicle.id, "ROGUE-GUN-AWD-CARPLAY");
  assert.ok(result.exact.every((match) => match.vehicle.model === "Rogue"));
  assert.ok(!result.exact.some((match) => match.vehicle.id === "UNRELATED-RED-HYBRID"));
}

{
  const result = searchInventory(vehicles, "gun metallic rogue");
  assert.ok(result.exact.length >= 2);
  assert.ok(result.exact.every((match) => match.vehicle.model === "Rogue" && match.vehicle.exteriorColor === "Gun Metallic"));
}

{
  const result = searchInventory(vehicles, "carplay");
  assert.deepEqual(result.exact.map((match) => match.vehicle.id).sort(), ["KICKS-CARPLAY", "ROGUE-GUN-AWD-CARPLAY", "ROGUE-GUN-FWD-CARPLAY", "UNRELATED-RED-HYBRID"].sort());
  assert.ok(!result.exact.some((match) => match.vehicle.id === "ROGUE-RED-AWD-NO-CARPLAY"));
}

{
  const result = searchInventory(vehicles, "red rogue awd");
  assert.equal(result.exact.length, 1);
  assert.equal(result.exact[0]?.vehicle.id, "ROGUE-RED-AWD-NO-CARPLAY");
  assert.ok(!result.exact.some((match) => match.vehicle.id === "UNRELATED-RED-HYBRID"));
}

{
  const result = searchInventory(vehicles, "rogue awd carplay");
  assert.equal(result.exact.length, 1);
  assert.equal(result.exact[0]?.vehicle.id, "ROGUE-GUN-AWD-CARPLAY");
  assert.ok(result.exact[0]?.matched.includes("Apple CarPlay"));
}

{
  const result = searchInventory(vehicles, "red rogue awd carplay");
  assert.equal(result.exact.length, 0);
  assert.ok(result.close.length >= 2);
  assert.ok(result.close.every((match) => match.vehicle.model === "Rogue"));
  assert.equal(result.close[0]?.vehicle.id, "ROGUE-RED-AWD-NO-CARPLAY");
  assert.deepEqual(result.close[0]?.missing, ["Apple CarPlay is not listed by the source"]);
  assert.ok(!result.close.some((match) => match.vehicle.id === "UNRELATED-RED-HYBRID"));
}

{
  const result = searchInventory(vehicles, "rogue awd carplay");
  assert.ok(result.exact.every((match) => match.vehicle.drivetrain === "AWD"));
  assert.ok(!result.exact.some((match) => match.vehicle.id === "ROGUE-GUN-FWD-CARPLAY"));
}

console.log("PASS_INVENTORY_SEARCH_STRUCTURED_CONSTRAINTS");
