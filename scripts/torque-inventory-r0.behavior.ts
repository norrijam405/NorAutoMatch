import assert from "node:assert/strict";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { torqueSourcingTruth } from "../src/lib/torque-sourcing-language";
import { planTorqueFollowUp } from "../src/lib/torque-follow-up-plan";
import { createVehicleHunt, applyVehicleHuntCandidates } from "../src/lib/vehicle-hunt";
import { requireAuthorizedDealershipCrmAdapter } from "../src/lib/dealership-crm-adapter";
import { matchScoutObservationToHunt } from "../src/lib/scout-opportunity-matcher";
import { buildSalespersonDailyBrief } from "../src/lib/salesperson-daily-brief";
import { matchVehicleHuntToLocalInventory } from "../src/lib/vehicle-hunt-inventory-matcher";
import { prepareTorqueHuntFollowUp } from "../src/lib/torque-follow-up-draft";
import { buildTorqueCrmSyncPlan } from "../src/lib/torque-crm-sync-plan";
import { chooseTorqueNextBestAction } from "../src/lib/torque-next-best-action";
import { leadSchema } from "../src/lib/lead-schema";

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


const scoutMatch = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-12T20:05:00.000Z",
  observation: {
    observationId: "obs_pathfinder_incentive_1",
    topic: "INCENTIVE",
    headline: "Synthetic verified Pathfinder incentive",
    summary: "Synthetic primary-source incentive used only for behavior testing.",
    affectedMakes: ["Nissan"],
    affectedModels: ["Pathfinder"],
    observedAt: "2026-10-12T20:04:00.000Z",
    sourceId: "nissan-usa",
    sourceUrl: "https://www.nissanusa.com/",
    sourceClass: "OEM_OFFICIAL",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    torqueUse: "CUSTOMER_SAFE",
  },
});
assert.ok(scoutMatch.score >= 70);
assert.equal(scoutMatch.action, "TEXT_CUSTOMER");
assert.equal(scoutMatch.customerSafe, true);

const rumorMatch = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-12T20:06:00.000Z",
  observation: {
    observationId: "obs_unverified_1",
    topic: "MODEL_REFRESH",
    headline: "Synthetic rumor",
    summary: "Synthetic unverified report used only for behavior testing.",
    affectedMakes: ["Nissan"],
    affectedModels: ["Pathfinder"],
    observedAt: "2026-10-12T20:05:00.000Z",
    sourceId: "secondary",
    sourceUrl: "https://example.com/",
    sourceClass: "SECONDARY_MEDIA",
    evidenceState: "UNVERIFIED",
    salesImpact: "MEDIUM",
    torqueUse: "DO_NOT_USE",
  },
});
assert.equal(rumorMatch.action, "NO_ACTION");
assert.equal(rumorMatch.customerSafe, false);


const brief = buildSalespersonDailyBrief({
  generatedAt: "2026-10-12T21:00:00.000Z",
  items: [{
    observationId: "obs_pathfinder_incentive_1",
    huntId: hunt.huntId,
    score: scoutMatch.score,
    action: scoutMatch.action,
    reasons: scoutMatch.reasons,
    headline: "Synthetic verified Pathfinder incentive",
    topic: "INCENTIVE",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    huntState: hunt.state,
    salespersonOwner: "operator",
    explicitCustomerText: hunt.explicitCustomerText,
    updatedAt: hunt.updatedAt,
  }],
});
assert.equal(brief.totalActionable, 1);
assert.equal(brief.textNow, 1);
assert.equal(brief.noActionClaim, "NO_COMMUNICATION_WAS_SENT_BY_THIS_BRIEF");
assert.equal(brief.topActions[0]?.huntId, hunt.huntId);


const exactPathfinderCandidates = matchVehicleHuntToLocalInventory({
  requirements: parseTorqueSalesInventorySpec(
    "New 2026 Pathfinder Baltic green brown seats 4WD under $55k",
  ),
  observedAt: "2026-10-12T21:10:00.000Z",
  vehicles: [{
    id: "5N1DR3DJ0TC200001",
    year: 2026,
    make: "Nissan",
    model: "Pathfinder",
    trim: "Platinum",
    price: 54_200,
    type: "SUV",
    mileage: 4,
    drivetrain: "4WD",
    image: "/synthetic.jpg",
    accent: "Baltic Teal Pearl",
    condition: "New",
    exteriorColor: "Baltic Teal Pearl",
    interiorColor: "Chestnut",
    features: ["Chestnut Semi-aniline Leather"],
  }],
});
assert.equal(exactPathfinderCandidates.length, 1);
assert.equal(exactPathfinderCandidates[0]?.fit, "EXACT");

const frontierCandidates = matchVehicleHuntToLocalInventory({
  requirements: parseTorqueSalesInventorySpec("New Frontier King Cab with extended bed"),
  observedAt: "2026-10-12T21:11:00.000Z",
  vehicles: [{
    id: "1N6ED1CL0TN600001",
    year: 2026,
    make: "Nissan",
    model: "Frontier",
    trim: "King Cab SV 6-foot Bed",
    price: 38_500,
    type: "Truck",
    mileage: 3,
    drivetrain: "4x4",
    image: "/synthetic.jpg",
    accent: "Gun Metallic",
    condition: "New",
    features: ["King Cab", "6-foot bed"],
  }],
});
assert.equal(frontierCandidates.length, 1);
assert.equal(frontierCandidates[0]?.fit, "EXACT");


const followUpHunt = applyVehicleHuntCandidates({
  hunt,
  observedAt: "2026-10-12T21:20:00.000Z",
  candidates: [{
    vin: "5N1DR3DJ0TC200001",
    sourceScope: "ORR_NISSAN_SIBLING",
    sourceLabel: "Synthetic network source",
    observedAt: "2026-10-12T21:20:00.000Z",
    fit: "EXACT",
    verified: true,
    reasons: ["Pathfinder", "4WD"],
    compromises: [],
  }],
});
const textDraft = prepareTorqueHuntFollowUp({
  hunt: followUpHunt,
  channel: "TEXT",
  customerFirstName: "Marcus",
  createdAt: "2026-10-12T21:21:00.000Z",
});
assert.equal(textDraft.status, "PREPARED_NOT_SENT");
assert.equal(textDraft.truthState, "DRAFT_ONLY");
assert.match(textDraft.body, /our network/i);
assert.doesNotMatch(textDraft.body, /guarantee|reserved/i);

assert.throws(
  () => prepareTorqueHuntFollowUp({
    hunt: { ...hunt, consentToContact: false },
    channel: "TEXT",
  }),
  /CONSENT_NOT_ESTABLISHED/,
);


const blockedCrmPlan = buildTorqueCrmSyncPlan({
  hunt: {
    huntId: followUpHunt.huntId,
    state: followUpHunt.state,
    explicitCustomerText: followUpHunt.explicitCustomerText,
    candidateVins: followUpHunt.candidateVins,
    truth: followUpHunt.truth,
  },
  adapterEvidence: {
    providerId: "synthetic-crm",
    adapterVersion: "0.0.0",
    contractState: "UNVERIFIED",
    authorizationRef: null,
    sourceContractRef: null,
    capabilities: [],
  },
  preparedFollowUp: textDraft,
  dueAt: "2026-10-12T21:30:00.000Z",
});
assert.equal(blockedCrmPlan.state, "BLOCKED_UNVERIFIED_ADAPTER");
assert.equal(blockedCrmPlan.crmWriteState, "NOT_WRITTEN");
assert.equal(blockedCrmPlan.outboundExecution, "NOT_PERFORMED");

const readyCrmPlan = buildTorqueCrmSyncPlan({
  hunt: {
    huntId: followUpHunt.huntId,
    state: followUpHunt.state,
    explicitCustomerText: followUpHunt.explicitCustomerText,
    candidateVins: followUpHunt.candidateVins,
    truth: followUpHunt.truth,
  },
  adapterEvidence: {
    providerId: "synthetic-crm",
    adapterVersion: "1.0.0",
    contractState: "VERIFIED_AUTHORIZED_CONTRACT",
    authorizationRef: "evidence:synthetic-authorization",
    sourceContractRef: "contract:synthetic-v1",
    capabilities: ["WRITE_HUNT_REFERENCE", "CREATE_NOTE", "CREATE_TASK"],
  },
  preparedFollowUp: textDraft,
  dueAt: "2026-10-12T21:30:00.000Z",
});
assert.equal(readyCrmPlan.state, "READY_FOR_AUTHORIZED_ADAPTER");
assert.equal(readyCrmPlan.crmWriteState, "NOT_WRITTEN");
assert.match(readyCrmPlan.noteBody, /Transfer promised: false/);
assert.equal(readyCrmPlan.task?.channel, "TEXT");


const nextActionNetwork = chooseTorqueNextBestAction({ hunt: followUpHunt });
assert.equal(nextActionNetwork.action, "VERIFY_WITH_MANAGER");
assert.equal(nextActionNetwork.priority, "HIGH");
assert.equal(nextActionNetwork.maySendAutomatically, false);

const searchingAction = chooseTorqueNextBestAction({
  hunt: {
    huntId: hunt.huntId,
    state: "SEARCHING",
    consentToContact: true,
    candidateVins: [],
    truth: hunt.truth,
  },
});
assert.equal(searchingAction.action, "REFRESH_VERIFIED_INVENTORY");

const localTextAction = chooseTorqueNextBestAction({
  hunt: {
    huntId: hunt.huntId,
    state: "LOCAL_MATCH_FOUND",
    consentToContact: true,
    candidateVins: exactPathfinderCandidates,
    truth: {
      ...hunt.truth,
      exactLocalMatchVerified: true,
      sourcingRequired: false,
      humanVerificationRequired: false,
    },
  },
});
assert.equal(localTextAction.action, "PREPARE_TEXT");
assert.equal(localTextAction.maySendAutomatically, false);


const sourcingLeadBase = {
  firstName: "Synthetic",
  lastName: "Customer",
  email: "synthetic@example.com",
  phone: "4055550101",
  budgetRange: "Open / discuss with me",
  paymentMethod: "Financing" as const,
  tradeIn: "",
  notes: "Synthetic sourcing test only",
  source: "Torque behavior test",
  trigger: "trapdoor" as const,
  pipeline: "Vehicle Sourcing" as const,
  shortlistedVehicleIds: [],
  monthlyTarget: 0,
  downPayment: 0,
  termMonths: 60,
  consent: true as const,
};

const validSourcingLead = leadSchema.safeParse({
  ...sourcingLeadBase,
  vehicleHuntRequest: "New 2026 Pathfinder Baltic Teal Chestnut 4WD",
});
assert.equal(validSourcingLead.success, true);

const validLinkedLead = leadSchema.safeParse({
  ...sourcingLeadBase,
  vehicleHuntId: hunt.huntId,
});
assert.equal(validLinkedLead.success, true);

const invalidLinkedLead = leadSchema.safeParse({
  ...sourcingLeadBase,
  vehicleHuntId: "namvh_not-valid",
});
assert.equal(invalidLinkedLead.success, false);

const oversizedSourcingLead = leadSchema.safeParse({
  ...sourcingLeadBase,
  vehicleHuntRequest: "x".repeat(1201),
});
assert.equal(oversizedSourcingLead.success, false);
