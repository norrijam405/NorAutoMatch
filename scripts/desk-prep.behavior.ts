import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const lead: LeadPayload = {
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

const evidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: ["VIN1"],
  verifiedVehicleIds: ["VIN1"],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T01:00:00.000Z",
  sourceFetchedAt: "2026-09-09T00:59:00.000Z",
  sourceHash: "a".repeat(64),
};

function run() {
  const packet = buildDeskPrepPacket({ lead, inventoryEvidence: evidence, createdAt: "2026-09-09T01:30:00.000Z" });
  assert(packet.protocol === "NORAUTO_DESK_PREP_V1", "Desk packet protocol identity must be explicit.");
  assert(packet.buyingLane.truthState === "CUSTOMER_STATED", "Customer payment targets must remain customer-stated, not verified deal terms.");
  assert(packet.trade.truthState === "CUSTOMER_STATED", "Trade description must not become a valuation.");
  assert(packet.trade.valuationAuthority === "MANAGER_OR_APPROVED_TRADE_PROCESS_ONLY", "Trade valuation authority must stay outside NorAutoMatch.");
  assert(packet.vehicleEvidence.state === "VERIFIED_LIVE", "Inventory evidence must survive into desk prep.");
  assert(packet.authority.finalSellingPrice === "NOT_AUTHORIZED", "Desk prep cannot set final selling price.");
  assert(packet.authority.financingApproval === "NOT_AUTHORIZED", "Desk prep cannot approve financing.");
  assert(packet.authority.paymentCommitment === "NOT_AUTHORIZED", "Estimated payment cannot become a commitment.");
  assert(packet.authority.lenderSelection === "NOT_AUTHORIZED", "Desk prep cannot choose a lender.");
  assert(packet.authority.dealApproval === "MANAGER_REQUIRED" && packet.managerReviewRequired, "Manager must retain deal authority.");

  const sourcing = buildDeskPrepPacket({
    lead: { ...lead, trigger: "trapdoor", pipeline: "Vehicle Sourcing", shortlistedVehicleIds: [], tradeIn: "" },
    inventoryEvidence: { state: "NO_SHORTLIST", requestedVehicleIds: [], verifiedVehicleIds: [], unverifiedVehicleIds: [] },
  });
  assert(sourcing.pipeline === "Vehicle Sourcing", "Vehicle sourcing pipeline must survive desk prep.");
  assert(sourcing.trade.truthState === "UNVERIFIED", "No trade statement must not manufacture trade evidence.");

  console.log("PASS desk prep authority and evidence invariants");
}

run();
