import assert from "node:assert/strict";
import { BATTLE_PRIORITIES, isBattlePriority, resolveBattlePriority, battleFollowupType } from "../src/lib/torque-battle-followup";

assert.equal(resolveBattlePriority("What about gas mileage?", "budget"), "fuel");
assert.equal(resolveBattlePriority("Does either have more cargo room?", "fuel"), "space");
assert.equal(resolveBattlePriority("And the price?", "space"), "budget");
assert.equal(resolveBattlePriority("How does it do in the snow?", "budget"), "weather");
assert.equal(resolveBattlePriority("Which one is easier to park?", "fuel"), "city");
assert.equal(resolveBattlePriority("And tell me more?", "fuel"), "fuel", "Unrelated followup preserves explicit priority");
assert.equal(resolveBattlePriority("Show me everything", "fuel"), "all");
assert.equal(battleFollowupType("Which would you recommend?"), "choice");
assert.equal(battleFollowupType("Why is that?"), "details");
assert.equal(battleFollowupType("Compare them for fuel economy"), "comparison");
assert.equal(isBattlePriority("fuel"), true);
assert.equal(isBattlePriority("production-promotion"), false);
assert.deepEqual(BATTLE_PRIORITIES.fuel, ["highway-mpg", "city-mpg"]);
console.log("PASS_TORQUE_BATTLE_FOLLOWUP_PRIORITY_BOUNDARIES");
