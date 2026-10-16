import { resolveDealershipScope, dealerInventorySearchAvailable } from "../src/lib/dealership-scope";
import assert from "node:assert/strict";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { torqueSourcingTruth } from "../src/lib/torque-sourcing-language";
import { planTorqueFollowUp } from "../src/lib/torque-follow-up-plan";
import { createVehicleHunt, applyVehicleHuntCandidates } from "../src/lib/vehicle-hunt";
import { requireAuthorizedDealershipCrmAdapter } from "../src/lib/dealership-crm-adapter";
import { matchScoutObservationToHunt } from "../src/lib/scout-opportunity-matcher";
import { buildSalespersonDailyBrief } from "../src/lib/salesperson-daily-brief";
import { rankVehiclesForSalesSpec, matchVehicleHuntToLocalInventory } from "../src/lib/vehicle-hunt-inventory-matcher";
import { prepareTorqueHuntFollowUp } from "../src/lib/torque-follow-up-draft";
import { buildTorqueCrmSyncPlan } from "../src/lib/torque-crm-sync-plan";
import { chooseTorqueNextBestAction } from "../src/lib/torque-next-best-action";
import { leadSchema } from "../src/lib/lead-schema";
import { answerTorqueInventory } from "../src/lib/torque-inventory-assistant";
import { buildNissanNationalSearchPlan } from "../src/lib/nissan-national-search";
import { resolveDealershipCrmRuntime } from "../src/lib/dealership-crm-runtime";

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


const publicTorqueSpec = parseTorqueSalesInventorySpec(
  "New 2026 Pathfinder Baltic green brown seats 4WD under $55k",
);
const publicTorqueAnswer = answerTorqueInventory({
  message: "New 2026 Pathfinder Baltic green brown seats 4WD under $55k",
  mode: "verified-live",
  spec: publicTorqueSpec,
  vehicles: [
    {
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
    },
    {
      id: "5N1DR3DJ0TC200002",
      year: 2026,
      make: "Nissan",
      model: "Pathfinder",
      trim: "Platinum",
      price: 53_900,
      type: "SUV",
      mileage: 5,
      drivetrain: "4WD",
      image: "/synthetic-2.jpg",
      accent: "Super Black",
      condition: "New",
      exteriorColor: "Super Black",
      interiorColor: "Charcoal",
      features: ["Charcoal Leather"],
    },
  ],
});
assert.equal(publicTorqueAnswer.exactCount, 1);
assert.equal(publicTorqueAnswer.matches[0]?.id, "5N1DR3DJ0TC200001");
assert.equal(publicTorqueAnswer.matches[0]?.fit, "exact");


const nationalPlan = buildNissanNationalSearchPlan(publicTorqueSpec);
assert.equal(nationalPlan.authority, "OFFICIAL_NISSAN_DISCOVERY_ONLY");
assert.equal(nationalPlan.availabilityClaim, "NOT_PROVEN");
assert.equal(nationalPlan.transferClaim, "NOT_PROVEN");
assert.match(nationalPlan.url, /nissanusa\.com\/shopping-tools\/search-inventory/);
assert.match(nationalPlan.url, /models=pathfinder/);
assert.match(nationalPlan.url, /modelYear=2026/);
assert.ok(nationalPlan.residualRequirements.some((item) => /exterior color/i.test(item)));
assert.ok(nationalPlan.residualRequirements.some((item) => /interior color/i.test(item)));


const crmUnconfigured = resolveDealershipCrmRuntime({});
assert.equal(crmUnconfigured.state, "UNCONFIGURED");
assert.equal(crmUnconfigured.writeAuthority, false);

const crmEvidenceOnly = resolveDealershipCrmRuntime({
  providerId: "synthetic-crm",
  adapterVersion: "1.0.0",
  authorizationRef: "evidence:synthetic",
  sourceContractRef: "contract:synthetic",
  capabilitiesCsv: "CREATE_NOTE,CREATE_TASK,WRITE_HUNT_REFERENCE",
  implementedProviderIds: [],
});
assert.equal(crmEvidenceOnly.state, "ADAPTER_NOT_IMPLEMENTED");
assert.equal(crmEvidenceOnly.writeAuthority, false);

const crmReadyForBinding = resolveDealershipCrmRuntime({
  providerId: "synthetic-crm",
  adapterVersion: "1.0.0",
  authorizationRef: "evidence:synthetic",
  sourceContractRef: "contract:synthetic",
  capabilitiesCsv: "CREATE_NOTE,CREATE_TASK,WRITE_HUNT_REFERENCE",
  implementedProviderIds: ["synthetic-crm"],
});
assert.equal(crmReadyForBinding.state, "READY_FOR_ADAPTER_BINDING");
assert.equal(crmReadyForBinding.writeAuthority, false);


const preferredTrimSpec = parseTorqueSalesInventorySpec(
  "2026 Pathfinder 4WD, Platinum preferred",
);
assert.equal(preferredTrimSpec.trim?.value, "Platinum");
assert.equal(preferredTrimSpec.trim?.priority, "PREFERRED");

const identityGateAnswer = answerTorqueInventory({
  message: "2026 Pathfinder 4WD",
  mode: "verified-live",
  spec: parseTorqueSalesInventorySpec("2026 Pathfinder 4WD"),
  vehicles: [
    {
      id: "5N1DR3DJ0TC200003",
      year: 2026,
      make: "Nissan",
      model: "Pathfinder",
      trim: "SL",
      price: 48_000,
      type: "SUV",
      mileage: 6,
      drivetrain: "4WD",
      image: "/synthetic-pathfinder.jpg",
      accent: "White",
      condition: "New",
    },
    {
      id: "5N1AZ3CS0TC100001",
      year: 2026,
      make: "Nissan",
      model: "Murano",
      trim: "Platinum",
      price: 47_000,
      type: "SUV",
      mileage: 5,
      drivetrain: "AWD",
      image: "/synthetic-murano.jpg",
      accent: "White",
      condition: "New",
    },
  ],
});
assert.equal(identityGateAnswer.matches.some((match) => /Murano/i.test(match.label)), false);


const preferredTrimAnswer = answerTorqueInventory({
  message: "2026 Pathfinder 4WD, Platinum preferred",
  mode: "verified-live",
  spec: preferredTrimSpec,
  vehicles: [{
    id: "5N1DR3DJ0TC200004",
    year: 2026,
    make: "Nissan",
    model: "Pathfinder",
    trim: "SL",
    price: 49_000,
    type: "SUV",
    mileage: 5,
    drivetrain: "4WD",
    image: "/synthetic-sl.jpg",
    accent: "White",
    condition: "New",
  }],
});
assert.equal(preferredTrimAnswer.exactCount, 0);
assert.equal(preferredTrimAnswer.matches[0]?.fit, "strong");
assert.equal(preferredTrimAnswer.handoff.required, false);
assert.match(preferredTrimAnswer.answer, /must-haves are covered/i);


const strongLocalHunt = applyVehicleHuntCandidates({
  hunt: createVehicleHunt({
    workspaceId: "norautomatch",
    origin: "FRESH_UP",
    requirements: preferredTrimSpec,
    explicitCustomerText: "2026 Pathfinder 4WD, Platinum preferred",
    consentToContact: true,
    createdAt: "2026-10-13T21:40:00.000Z",
  }),
  observedAt: "2026-10-13T21:41:00.000Z",
  candidates: [{
    vin: "5N1DR3DJ0TC200004",
    sourceScope: "LOCAL_STORE",
    sourceLabel: "Synthetic verified local",
    observedAt: "2026-10-13T21:41:00.000Z",
    fit: "STRONG",
    verified: true,
    reasons: ["Pathfinder", "4WD"],
    compromises: ["trim mismatch"],
  }],
});
assert.equal(strongLocalHunt.state, "LOCAL_MATCH_FOUND");
assert.equal(strongLocalHunt.truth.exactLocalMatchVerified, false);
assert.equal(strongLocalHunt.truth.sourcingRequired, false);
assert.equal(strongLocalHunt.truth.humanVerificationRequired, false);


const strongLocalDraft = prepareTorqueHuntFollowUp({
  hunt: strongLocalHunt,
  channel: "TEXT",
  customerFirstName: "Synthetic",
  createdAt: "2026-10-13T21:42:00.000Z",
});
assert.match(strongLocalDraft.body, /covers the must-haves/i);
assert.match(strongLocalDraft.body, /preference difference/i);
assert.equal(strongLocalDraft.status, "PREPARED_NOT_SENT");


const unrelatedScout = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-13T22:00:00.000Z",
  observation: {
    observationId: "obs_unrelated_camry_incentive",
    topic: "INCENTIVE",
    headline: "Synthetic Toyota Camry incentive",
    summary: "Unrelated verified primary-source observation for regression testing.",
    affectedMakes: ["Toyota"],
    affectedModels: ["Camry"],
    observedAt: "2026-10-13T21:59:00.000Z",
    sourceId: "synthetic-toyota",
    sourceUrl: "https://example.com/toyota",
    sourceClass: "OEM_OFFICIAL",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    torqueUse: "CUSTOMER_SAFE",
  },
});
assert.equal(unrelatedScout.action, "NO_ACTION");
assert.equal(unrelatedScout.customerSafe, false);
assert.equal(unrelatedScout.score, 0);
assert.ok(unrelatedScout.reasons.includes("NO_RELEVANT_VEHICLE_IDENTITY_EVIDENCE"));

const wrongModelScout = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-13T22:01:00.000Z",
  observation: {
    observationId: "obs_unrelated_nissan_rogue",
    topic: "INCENTIVE",
    headline: "Synthetic Nissan Rogue incentive",
    summary: "Same make but wrong model, must not trigger customer contact.",
    affectedMakes: ["Nissan"],
    affectedModels: ["Rogue"],
    observedAt: "2026-10-13T22:00:00.000Z",
    sourceId: "nissan-usa",
    sourceUrl: "https://www.nissanusa.com/",
    sourceClass: "OEM_OFFICIAL",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    torqueUse: "CUSTOMER_SAFE",
  },
});
assert.equal(wrongModelScout.action, "NO_ACTION");
assert.equal(wrongModelScout.score, 0);


const expiredScout = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-13T22:00:00.000Z",
  observation: {
    observationId: "obs_expired_pathfinder_incentive",
    topic: "INCENTIVE",
    headline: "Expired synthetic Pathfinder incentive",
    summary: "Validly sourced but expired offer.",
    affectedMakes: ["Nissan"],
    affectedModels: ["Pathfinder"],
    observedAt: "2026-10-12T20:00:00.000Z",
    expiresAt: "2026-10-13T21:00:00.000Z",
    sourceId: "nissan-usa",
    sourceUrl: "https://www.nissanusa.com/",
    sourceClass: "OEM_OFFICIAL",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    torqueUse: "CUSTOMER_SAFE",
  },
});
assert.equal(expiredScout.action, "NO_ACTION");
assert.equal(expiredScout.score, 0);
assert.ok(expiredScout.reasons.includes("SCOUT_OBSERVATION_OUTSIDE_EFFECTIVE_WINDOW"));

const pausedScout = matchScoutObservationToHunt({
  hunt: { ...hunt, state: "PAUSED" },
  createdAt: "2026-10-12T20:05:00.000Z",
  observation: {
    observationId: "obs_paused_pathfinder_incentive",
    topic: "INCENTIVE",
    headline: "Verified synthetic Pathfinder incentive",
    summary: "Paused Hunt must not create an outreach action.",
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
assert.equal(pausedScout.action, "NO_ACTION");
assert.equal(pausedScout.score, 0);
assert.ok(pausedScout.reasons.includes("HUNT_NOT_ACTIVE"));


const futureScout = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-13T22:00:00.000Z",
  observation: {
    observationId: "obs_future_pathfinder_incentive",
    topic: "INCENTIVE",
    headline: "Synthetic future Pathfinder incentive",
    summary: "Not effective yet; do not prepare outreach.",
    affectedMakes: ["Nissan"],
    affectedModels: ["Pathfinder"],
    observedAt: "2026-10-13T21:00:00.000Z",
    effectiveAt: "2026-10-15T00:00:00.000Z",
    sourceId: "nissan-usa",
    sourceUrl: "https://www.nissanusa.com/",
    sourceClass: "OEM_OFFICIAL",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    torqueUse: "CUSTOMER_SAFE",
  },
});
assert.equal(futureScout.action, "NO_ACTION");
assert.ok(futureScout.reasons.includes("SCOUT_OBSERVATION_OUTSIDE_EFFECTIVE_WINDOW"));

const closedScout = matchScoutObservationToHunt({
  hunt: { ...hunt, state: "CLOSED" },
  createdAt: "2026-10-12T20:05:00.000Z",
  observation: {
    observationId: "obs_closed_pathfinder_incentive",
    topic: "INCENTIVE",
    headline: "Synthetic verified Pathfinder incentive",
    summary: "Closed Hunt cannot generate a contact recommendation.",
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
assert.equal(closedScout.action, "NO_ACTION");
assert.ok(closedScout.reasons.includes("HUNT_NOT_ACTIVE"));


const futureObservedScout = matchScoutObservationToHunt({
  hunt,
  createdAt: "2026-10-13T22:00:00.000Z",
  observation: {
    observationId: "obs_future_observed_pathfinder",
    topic: "INCENTIVE",
    headline: "Synthetic future-dated Pathfinder report",
    summary: "A report observed in the future must not justify present customer outreach.",
    affectedMakes: ["Nissan"],
    affectedModels: ["Pathfinder"],
    observedAt: "2026-10-15T00:00:00.000Z",
    sourceId: "nissan-usa",
    sourceUrl: "https://www.nissanusa.com/",
    sourceClass: "OEM_OFFICIAL",
    evidenceState: "PRIMARY_VERIFIED",
    salesImpact: "HIGH_OPPORTUNITY",
    torqueUse: "CUSTOMER_SAFE",
  },
});
assert.equal(futureObservedScout.action, "NO_ACTION");
assert.equal(futureObservedScout.score, 0);
assert.ok(futureObservedScout.reasons.includes("SCOUT_OBSERVATION_OUTSIDE_EFFECTIVE_WINDOW"));


const missingDemoVehicle = answerTorqueInventory({
  message: "Do you have a 2026 Nissan Pathfinder?",
  vehicles: [],
  mode: "representative-demo",
  spec: parseTorqueSalesInventorySpec("Do you have a 2026 Nissan Pathfinder?"),
});
assert.equal(missingDemoVehicle.mode, "representative-demo");
assert.match(missingDemoVehicle.answer, /sample vehicles/i);
assert.match(missingDemoVehicle.answer, /NOT Orr Nissan West's live inventory/);
assert.doesNotMatch(missingDemoVehicle.answer, /No — I don't have/);


const oklahomaDealer = resolveDealershipScope("orr-nissan-west");
const irvingDealer = resolveDealershipScope("irving-hyundai-pending");
assert.ok(oklahomaDealer);
assert.ok(irvingDealer);
assert.equal(oklahomaDealer?.brand, "Nissan");
assert.equal(irvingDealer?.brand, "Hyundai");
assert.equal(dealerInventorySearchAvailable(oklahomaDealer!), true);
assert.equal(dealerInventorySearchAvailable(irvingDealer!), false);
assert.equal(resolveDealershipScope("fake-dealership"), null);
assert.equal(resolveDealershipScope(undefined), null);


const hyundaiPalisade = parseTorqueSalesInventorySpec("Find a new 2026 Hyundai Palisade AWD under $48k");
assert.equal(hyundaiPalisade.make?.value, "Hyundai");
assert.equal(hyundaiPalisade.model?.value, "Palisade");
assert.equal(hyundaiPalisade.modelYear?.value, 2026);
assert.equal(hyundaiPalisade.drivetrain?.value, "AWD");
const hyundaiIoniq = parseTorqueSalesInventorySpec("Looking for an Ioniq 5");
assert.equal(hyundaiIoniq.make?.value, "Hyundai");
assert.equal(hyundaiIoniq.model?.value, "Ioniq 5");
assert.equal(parseTorqueSalesInventorySpec("2026 Rogue").make?.value, "Nissan");
const unknownHyundai = answerTorqueInventory({
  message: "2026 Hyundai Palisade",
  vehicles: [],
  mode: "representative-demo",
  spec: hyundaiPalisade,
});
assert.match(unknownHyundai.answer, /sample vehicles/i);

const exactVin = "1N4BL4DV9SN320880";
const vinSpec = parseTorqueSalesInventorySpec("Can you check VIN: 1N4BL4DV9SN320880?");
assert.equal(vinSpec.vin?.value, exactVin);
assert.equal(parseTorqueSalesInventorySpec("VIN: 1N4BL4DV9SN32088I").vin, undefined);
const vinFixture = {
  id: exactVin, year: 2025, make: "Nissan", model: "Altima", trim: "SV",
  price: 19970, type: "Sedan", mileage: 40776, drivetrain: "FWD",
  image: "", accent: "",
};
assert.deepEqual(
  rankVehiclesForSalesSpec({ requirements: vinSpec, vehicles: [
    { ...vinFixture, id: "1N4BL4DV9SN320881" }, vinFixture,
  ] }).map((entry) => entry.vehicle.id),
  [exactVin],
);
assert.equal(rankVehiclesForSalesSpec({
  requirements: vinSpec, vehicles: [{ ...vinFixture, id: "1N4BL4DV9SN320881" }],
}).length, 0);
