import assert from "node:assert/strict";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { torqueSourcingTruth } from "../src/lib/torque-sourcing-language";
import { planTorqueFollowUp } from "../src/lib/torque-follow-up-plan";
import { createVehicleHunt, applyVehicleHuntCandidates } from "../src/lib/vehicle-hunt";
import { requireAuthorizedDealershipCrmAdapter } from "../src/lib/dealership-crm-adapter";

const pathfinder = parseTorqueSalesInventorySpec(
  "I need a new 2026 Baltic green Pathfinder with brown seats and 4WD under $55k",
);
assert.equal(pathfinder.make?.value, "Nissan");
assert.equal(pathfinder.model?.value, "Pathfinder");
assert.equal(pathfinder.modelYear?.value, 2026);
assert.equal(pathfinder.condition?.value, "NEW");
assert.equal(pathfinder.exteriorColor?.value, "Baltic Teal Pearl");
assert.equal(pathfinder.interiorColor?.value, "Chestnut");
assert.equal(pathfinder.drivetrain?.value, "4WD");
assert.equal(pathfinder.maxPrice?.value, 55_000);

const frontier = parseTorqueSalesInventorySpec(
  "Find me a new Frontier King Cab with the extended bed",
);
assert.equal(frontier.model?.value, "Frontier");
assert.equal(frontier.cabStyle?.value, "KING_CAB");
assert.equal(frontier.bedLength?.value, "LONG");

const oklahoma = torqueSourcingTruth({
  sourcingClass: "ORR_OKLAHOMA",
  transferConfirmed: false,
  sameDayConfirmed: false,
});
assert.equal(oklahoma.mayPromiseSameDay, false);
assert.match(oklahoma.customerFacingPosition, /may be able to get it here today/i);

const confirmed = torqueSourcingTruth({
  sourcingClass: "ORR_OKLAHOMA",
  transferConfirmed: true,
  sameDayConfirmed: true,
});
assert.equal(confirmed.mayPromiseSameDay, true);
assert.match(confirmed.customerFacingPosition, /by the end of the day/i);

const followUp = planTorqueFollowUp("EXACT_MATCH_FOUND", {
  opportunityId: "namo_0123456789abcdef01234567",
  customerFirstName: "Synthetic",
  consent: true,
  textAuthorized: true,
  emailAuthorized: true,
  suppressed: false,
  exactMatchVin: "1N4TESTVIN0000001",
});
assert.equal(followUp.allowed, true);
assert.equal(followUp.primaryChannel, "TEXT");
assert.equal(followUp.fallbackChannel, "EMAIL");
assert.equal(followUp.urgency, "NOW");

const suppressed = planTorqueFollowUp("NO_REPLY", {
  opportunityId: "namo_0123456789abcdef01234567",
  customerFirstName: "Synthetic",
  consent: true,
  textAuthorized: true,
  emailAuthorized: true,
  suppressed: true,
});
assert.equal(suppressed.allowed, false);
assert.ok(suppressed.stopReasons.includes("CUSTOMER_SUPPRESSED"));

console.log("Torque inventory + sourcing + follow-up R0 behavior: PASS");


const huntSpec = parseTorqueSalesInventorySpec(
  "2026 Pathfinder Baltic green brown seats 4WD",
);
const hunt = createVehicleHunt({
  workspaceId: "norautomatch",
  origin: "FRESH_UP",
  requirements: huntSpec,
  explicitCustomerText: "2026 Pathfinder Baltic green brown seats 4WD",
  consentToContact: true,
  createdAt: "2026-10-12T20:00:00.000Z",
  salespersonOwner: "operator",
});
assert.equal(hunt.state, "SEARCHING");
assert.deepEqual(hunt.preferredContactOrder, ["TEXT", "EMAIL"]);
assert.equal(hunt.truth.transferPromised, false);

const networkHunt = applyVehicleHuntCandidates({
  hunt,
  observedAt: "2026-10-12T20:01:00.000Z",
  candidates: [{
    vin: "1N8ABCDEF12345678",
    sourceScope: "ORR_NISSAN_SIBLING",
    sourceLabel: "Synthetic sibling source",
    observedAt: "2026-10-12T20:01:00.000Z",
    fit: "EXACT",
    verified: true,
    reasons: ["Pathfinder", "4WD", "Baltic Teal Pearl", "Chestnut"],
    compromises: [],
  }],
});
assert.equal(networkHunt.state, "NETWORK_MATCH_FOUND");
assert.equal(networkHunt.truth.sourcingRequired, true);
assert.equal(networkHunt.truth.humanVerificationRequired, true);
assert.equal(networkHunt.truth.transferPromised, false);

assert.throws(
  () => requireAuthorizedDealershipCrmAdapter({
    providerId: "synthetic-crm",
    adapterVersion: "0.0.0",
    contractState: "UNVERIFIED",
    authorizationRef: null,
    sourceContractRef: null,
    capabilities: ["WRITE_HUNT_REFERENCE"],
  }, "WRITE_HUNT_REFERENCE"),
  /CONTRACT_NOT_VERIFIED/,
);

requireAuthorizedDealershipCrmAdapter({
  providerId: "synthetic-crm",
  adapterVersion: "1.0.0",
  contractState: "VERIFIED_AUTHORIZED_CONTRACT",
  authorizationRef: "evidence:synthetic-authorization",
  sourceContractRef: "contract:synthetic-v1",
  capabilities: ["WRITE_HUNT_REFERENCE"],
}, "WRITE_HUNT_REFERENCE");
