import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import { readFollowUpQueue } from "../src/lib/crm-follow-up";
import type { LeadInventoryEvidence } from "../src/lib/lead-inventory-evidence";
import type { LeadPayload } from "../src/lib/lead-schema";
import { createManagerHandoff } from "../src/lib/manager-handoff";
import { persistLeadAsCrmOpportunity } from "../src/lib/crm-lead-intake";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "../src/lib/crm-postgres-adapter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inventoryEvidence: LeadInventoryEvidence = {
  state: "VERIFIED_LIVE",
  requestedVehicleIds: [],
  verifiedVehicleIds: [],
  unverifiedVehicleIds: [],
  catalogSource: "orr-live",
  catalogGeneratedAt: "2026-09-09T05:00:00.000Z",
  sourceFetchedAt: "2026-09-09T04:59:00.000Z",
  sourceHash: "f".repeat(64),
};

function lead(email: string): LeadPayload {
  return {
    firstName: "Follow",
    lastName: "Up",
    email,
    phone: "4055550177",
    budgetRange: "$25,000-$35,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes: "follow-up queue integration",
    source: "CI-Follow-Up",
    trigger: "trapdoor",
    pipeline: "Vehicle Sourcing",
    shortlistedVehicleIds: [],
    monthlyTarget: 500,
    downPayment: 2500,
    termMonths: 60,
    consent: true,
  };
}

async function persist(input: {
  submittedAt: string;
  email: string;
  adapter: PostgresCrmPersistenceAdapter;
}) {
  const payload = lead(input.email);
  const deskPrep = buildDeskPrepPacket({ lead: payload, inventoryEvidence, createdAt: input.submittedAt });
  const managerHandoff = createManagerHandoff({ deskPrep, createdAt: input.submittedAt });
  return persistLeadAsCrmOpportunity({
    lead: payload,
    inventoryEvidence,
    managerHandoff,
    submittedAt: input.submittedAt,
    adapter: input.adapter,
  });
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for follow-up integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);
  try {
    const overdue = await persist({ submittedAt: "2026-09-09T05:00:00.000Z", email: "overdue@example.com", adapter });
    const dueSoon = await persist({ submittedAt: "2026-09-09T05:12:00.000Z", email: "due-soon@example.com", adapter });
    const upcoming = await persist({ submittedAt: "2026-09-09T05:20:00.000Z", email: "upcoming@example.com", adapter });

    const queue = await readFollowUpQueue({
      pool,
      workspaceId: "norautomatch",
      now: "2026-09-09T05:23:00.000Z",
      limit: 20,
    });

    const selected = queue.filter((item) => [overdue.opportunityId, dueSoon.opportunityId, upcoming.opportunityId].includes(item.opportunityId));
    assert(selected.length === 3, "Follow-up read model must return all unsatisfied nonterminal obligations.");
    assert(selected[0].opportunityId === overdue.opportunityId && selected[0].urgency === "OVERDUE", "Oldest due obligation must surface first as OVERDUE.");
    assert(selected[1].opportunityId === dueSoon.opportunityId && selected[1].urgency === "DUE_SOON", "Obligation within five minutes must surface as DUE_SOON.");
    assert(selected[2].opportunityId === upcoming.opportunityId && selected[2].urgency === "UPCOMING", "Later obligation must remain UPCOMING.");
    assert(selected.every((item) => item.pipeline === "Vehicle Sourcing"), "Follow-up queue must preserve pipeline identity.");
    assert(selected.every((item) => item.authorityEffect === "NONE"), "Follow-up read model must not manufacture contact authority.");

    await pool.query(
      `UPDATE crm_opportunities SET stage = 'CONTACTED' WHERE opportunity_id = $1`,
      [overdue.opportunityId],
    );
    const afterContact = await readFollowUpQueue({
      pool,
      workspaceId: "norautomatch",
      now: "2026-09-09T05:23:00.000Z",
      limit: 20,
    });
    assert(!afterContact.some((item) => item.opportunityId === overdue.opportunityId), "Already-contacted opportunity must not remain in actionable follow-up queue.");

    console.log("PASS_NODE_POSTGRES_FOLLOW_UP_OBLIGATION_QUEUE");
  } finally {
    await pool.end();
  }
}

run();
