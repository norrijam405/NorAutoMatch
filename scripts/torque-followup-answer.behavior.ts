import assert from "node:assert/strict";
import type { Vehicle } from "../src/lib/inventory";
import type { TorqueVehicleMatch } from "../src/lib/torque-inventory-assistant";
import { scopedTorqueFollowup } from "../src/lib/torque-followup-answer";

const v: Vehicle = { id:"1N4AA000000000001", year:2026, make:"Nissan", model:"Rogue",
  trim:"SV",price:31990,type:"SUV",mileage:12,drivetrain:"AWD",image:"/test.jpg",accent:"Silver",cityMpg:28,highwayMpg:35 };
const m: TorqueVehicleMatch = { id:v.id, label:"2026 Nissan Rogue SV",price:v.price,mileage:v.mileage,
  type:v.type,drivetrain:v.drivetrain,fit:"exact",reasons:[],compromises:[] };
assert.match(scopedTorqueFollowup("And the price?",[m],[v],"verified-live") ?? "",/31,990/);
assert.match(scopedTorqueFollowup("What about fuel economy?",[m],[v],"verified-live") ?? "",/28 city \/ 35 highway MPG/);
assert.match(scopedTorqueFollowup("What about MPG?",[m],[{...v,cityMpg:undefined,highwayMpg:undefined}],"verified-live") ?? "",/not verified/);
assert.equal(scopedTorqueFollowup("Does it have leather?",[m],[v],"verified-live"),null);
assert.equal(scopedTorqueFollowup("What about MPG?",[],[v],"verified-live"),null);
assert.match(scopedTorqueFollowup("Price?",[m],[v],"representative-demo") ?? "",/demonstration catalog/);
console.log("PASS_TORQUE_PRICING_AND_MPG_FOLLOWUPS");
