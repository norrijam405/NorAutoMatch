import assert from "node:assert/strict";
import { extractVehicleVins } from "../src/lib/torque-video-recommendations";

assert.deepEqual(
  extractVehicleVins(["1N4BL4DV9SN320880", "not-a-vin", "1n4bl4dv9sn320880"]),
  ["1N4BL4DV9SN320880"],
);
assert.deepEqual(extractVehicleVins([]), []);
console.log("PASS Torque video recommendation VIN boundary");
