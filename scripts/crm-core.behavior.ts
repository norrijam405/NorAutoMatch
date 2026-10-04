import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { recordManagerReview } from "../src/lib/manager-review-receipt";
import {
  advanceCrmOpportunity,
  applyManagerReviewReceipt,
  createCrmOpportunity,
  deriveFollowUpState,
  toAnalyticsAttribution,
} from "../src/lib/crm-core";
import { createOpportunityAtomicWrite, crmOutboxConsumerKey } from "../src/lib/crm-outbox";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectThrow(fn: () => unknown, message: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const retailLead: LeadPayload = {
  firstName: "Norris",
  lastName: "Buyer",
  email: "buyer@example.com",
  phone: "4055550101",
  budgetRange: "$30,000-$35,000",
  paymentMethod: "Financing",
  tradeIn: "2019 Altima, customer says approximately 80k miles",
  notes: "Needs SUV and wants to stay near target payment.",
  source: "Website",
  trigger: "retail",
  pipeline: "Standard Retail",
  shortlistedVehicleIds: ["VIN1"],
  monthlyTarget: 550,
  downPayment: 4000,
  termMonths: 60,
  consent: true,
};

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN1"],
  verifiedVehicleIds: ["VIN1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T02:00:00.000Z",
  sourceFetchedAt: "2026-09-09T01:59:00.000Z",
  sourceHash: "a".repeat(64),
};

function handoffFor(lead: LeadPayload, evidence: LeadInventoryEvidence, createdAt: string) {
  const deskPrep = buildDeskPrepPacket({ lead, inventoryEvidence: evidence, createdAt });
  return createManagerHandoff({ deskPrep, createdAt });
}

function run() {
  const retailHandoff = handoffFor(retailLead, inventoryEvidence, "2026-09-09T02:10:00.000Z");
  const retailRetryHandoff = handoffFor(retailLead, inventoryEvidence, "2026-09-09T02:11:00.000Z");

  const retail = createCrmOpportunity({
    lead: retailLead,
    inventoryEvidence,
    handoff: retailHandoff,
    submittedAt: "2026-09-09T02:10:00.000Z",
    attribution: { source: "Website", campaign: "rogue-search", medium: "paid-search" },
  });
  const retailRetry = createCrmOpportunity({
    lead: retailLead,
    inventoryEvidence,
    handoff: retailRetryHandoff,
    submittedAt: "2026-09-09T02:12:00.000Z",
    attribution: { source: "Website", campaign: "rogue-search", medium: "paid-search" },
  });

  assert(retail.pipeline === "Standard Retail", "Retail opportunity must retain Standard Retail pipeline.");
  assert(retail.stage === "NEW", "CRM intake must not fabricate contact or appointment progress.");
  assert(retail.deskState === "MANAGER_REVIEW_PENDING", "Desk state must reflect the proven manager handoff.");
  assert(retail.opportunityId === retailRetry.opportunityId, "Same handoff facts must deduplicate to the same opportunity identity.");
  assert(retail.intakeIdempotencyKey === retailRetry.intakeIdempotencyKey, "Same handoff retry must preserve CRM intake idempotency.");

  const sourcingLead: LeadPayload = {
    ...retailLead,
    trigger: "trapdoor",
    pipeline: "Vehicle Sourcing",
    shortlistedVehicleIds: [],
    notes: "No current unit fits; source one.",
  };
  const sourcingEvidence: LeadInventoryEvidence = {
    state: "NO_SHORTLIST",
    requestedVehicleIds: [],
    verifiedVehicleIds: [],
    unverifiedVehicleIds: [],
  };
  const sourcingHandoff = handoffFor(sourcingLead, sourcingEvidence, "2026-09-09T02:13:00.000Z");
  const sourcing = createCrmOpportunity({
    lead: sourcingLead,
    inventoryEvidence: sourcingEvidence,
    handoff: sourcingHandoff,
    submittedAt: "2026-09-09T02:13:00.000Z",
  });
  assert(sourcing.pipeline === "Vehicle Sourcing", "Vehicle Sourcing must remain a separate CRM pipeline.");
  assert(sourcing.opportunityId !== retail.opportunityId, "Retail and Vehicle Sourcing must never silently collapse into one opportunity.");

  expectThrow(
    () => createCrmOpportunity({ lead: sourcingLead, inventoryEvidence: sourcingEvidence, handoff: retailHandoff, submittedAt: "2026-09-09T02:14:00.000Z" }),
    "Mismatched handoff and lead pipelines must fail closed.",
  );

  const contactPending = advanceCrmOpportunity({
    opportunity: retail,
    to: "CONTACT_PENDING",
    actor: "NORAUTO_SYSTEM",
    observedAt: "2026-09-09T02:11:00.000Z",
  });
  assert(contactPending.stage === "CONTACT_PENDING", "System may mark follow-up work pending without claiming contact occurred.");

  expectThrow(
    () => advanceCrmOpportunity({
      opportunity: contactPending,
      to: "CONTACTED",
      actor: "NORAUTO_SYSTEM",
      evidence: { kind: "CONTACT_CONFIRMED", ref: "fabricated", observedAt: "2026-09-09T02:12:00.000Z", authority: "NORAUTO_SYSTEM" },
    }),
    "NorAutoMatch must not manufacture confirmed customer contact.",
  );

  const contacted = advanceCrmOpportunity({
    opportunity: contactPending,
    to: "CONTACTED",
    actor: "MANAGER",
    evidence: { kind: "CONTACT_CONFIRMED", ref: "crm-contact-1", observedAt: "2026-09-09T02:12:00.000Z", authority: "MANAGER" },
  });
  assert(contacted.stage === "CONTACTED", "Evidence-backed contact must advance the lead.");

  const appointment = advanceCrmOpportunity({
    opportunity: contacted,
    to: "APPOINTMENT_SET",
    actor: "MANAGER",
    evidence: { kind: "APPOINTMENT_CONFIRMED", ref: "appt-42", observedAt: "2026-09-09T02:15:00.000Z", authority: "MANAGER" },
  });
  assert(appointment.stage === "APPOINTMENT_SET", "Confirmed appointment evidence must advance the opportunity.");

  expectThrow(
    () => advanceCrmOpportunity({
      opportunity: appointment,
      to: "SOLD",
      actor: "NORAUTO_SYSTEM",
      evidence: { kind: "DEALERSHIP_SOLD_OUTCOME", ref: "fake-sold", observedAt: "2026-09-09T03:00:00.000Z", authority: "NORAUTO_SYSTEM" },
    }),
    "NorAutoMatch must never self-mark a customer sold.",
  );
  expectThrow(
    () => advanceCrmOpportunity({ opportunity: appointment, to: "SOLD", actor: "MANAGER" }),
    "Sold outcome must require explicit outcome evidence.",
  );

  const sold = advanceCrmOpportunity({
    opportunity: appointment,
    to: "SOLD",
    actor: "DEALERSHIP_SYSTEM",
    evidence: { kind: "DEALERSHIP_SOLD_OUTCOME", ref: "deal-closed-42", observedAt: "2026-09-09T04:00:00.000Z", authority: "DEALERSHIP_SYSTEM" },
  });
  assert(sold.stage === "SOLD" && sold.outcome?.type === "SOLD", "Authoritative dealership sold evidence must be preserved as outcome evidence.");

  expectThrow(
    () => advanceCrmOpportunity({ opportunity: contactPending, to: "LOST", actor: "NORAUTO_SYSTEM" }),
    "An overdue or pending lead must not silently become lost.",
  );
  const lost = advanceCrmOpportunity({
    opportunity: contactPending,
    to: "LOST",
    actor: "MANAGER",
    evidence: { kind: "LOST_OUTCOME", ref: "manager-lost-1", observedAt: "2026-09-09T05:00:00.000Z", authority: "MANAGER" },
  });
  assert(lost.outcome?.evidenceRef.ref === "manager-lost-1", "Lost outcome must preserve explicit authoritative evidence.");

  const overdue = deriveFollowUpState({
    opportunity: contactPending,
    now: "2026-09-09T02:40:00.000Z",
    firstContactDueMinutes: 15,
  });
  assert(overdue.overdue && !overdue.satisfied && overdue.truthState === "DERIVED", "Follow-up breach must be derived without fabricating CRM progress.");
  assert(contactPending.stage === "CONTACT_PENDING", "Deriving overdue state must not mutate opportunity stage.");

  const unverifiedReceipt = recordManagerReview({
    handoff: retailHandoff,
    decision: "ACKNOWLEDGED",
    actor: { state: "UNVERIFIED", subjectId: "claimed-manager", verifier: "none" },
    recordedAt: "2026-09-09T02:20:00.000Z",
  });
  const unchanged = applyManagerReviewReceipt({ opportunity: retail, receipt: unverifiedReceipt });
  assert(unchanged.deskState === "MANAGER_REVIEW_PENDING" && !unchanged.latestManagerReceiptId, "Rejected manager receipt must not mutate CRM desk state.");

  const verifiedReceipt = recordManagerReview({
    handoff: retailHandoff,
    decision: "ACKNOWLEDGED",
    actor: { state: "VERIFIED", subjectId: "manager-42", verifier: "future-auth-gateway", evidenceRef: "auth-42" },
    recordedAt: "2026-09-09T02:21:00.000Z",
  });
  const reviewed = applyManagerReviewReceipt({ opportunity: retail, receipt: verifiedReceipt });
  assert(reviewed.deskState === "MANAGER_ACKNOWLEDGED", "Verified manager review receipt must update desk review state.");

  const atomicA = createOpportunityAtomicWrite({ opportunity: retail });
  const atomicRetry = createOpportunityAtomicWrite({ opportunity: retailRetry });
  assert(atomicA.invariant === "OPPORTUNITY_AND_OUTBOX_COMMIT_TOGETHER_OR_NOT_AT_ALL", "Persistence contract must carry atomic write invariant.");
  assert(atomicA.outbox.length === 1, "Opportunity intake must create exactly one creation outbox event.");
  assert(atomicA.outbox[0].eventId === atomicRetry.outbox[0].eventId, "Same opportunity retry must preserve outbox event identity.");
  assert(crmOutboxConsumerKey(atomicA.outbox[0]) === crmOutboxConsumerKey(atomicRetry.outbox[0]), "Same event retry must preserve consumer dedupe key.");

  const analytics = toAnalyticsAttribution(retail);
  const analyticsKeys = Object.keys(analytics);
  assert(!analyticsKeys.includes("email") && !analyticsKeys.includes("phone") && !analyticsKeys.includes("firstName") && !analyticsKeys.includes("lastName"), "Analytics attribution must exclude direct customer PII.");
  assert(analytics.pipeline === "Standard Retail" && analytics.campaign === "rogue-search", "Non-PII attribution must survive analytics projection.");

  console.log("PASS CRM opportunity, evidence, pipeline, follow-up, outcome, and outbox invariants");
}

run();
