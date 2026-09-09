import { buildDeskPrepPacket } from "../src/lib/desk-prep";
import { emitDueFollowUpEvents } from "../src/lib/crm-follow-up-due";
import { executeFirstContactAttemptCommand } from "../src/lib/crm-follow-up-command";
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
  catalogGeneratedAt: "2026-09-09T06:00:00.000Z",
  sourceFetchedAt: "2026-09-09T05:59:00.000Z",
  sourceHash: "d".repeat(64),
};

function lead(email: string): LeadPayload {
  return {
    firstName: "Due",
    lastName: "Event",
    email,
    phone: "4055550199",
    budgetRange: "$25,000-$35,000",
    paymentMethod: "Financing",
    tradeIn: "",
    notes: "follow-up due event integration",
    source: "CI-Follow-Up-Due",
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
  email: string;
  submittedAt: string;
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
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for follow-up due integration test.");

  const pool = createPostgresCrmPool(connectionString);
  const adapter = new PostgresCrmPersistenceAdapter(pool);
  try {
    const overdue = await persist({
      email: "due-overdue@example.com",
      submittedAt: "2026-09-09T06:00:00.000Z",
      adapter,
    });
    const future = await persist({
      email: "due-future@example.com",
      submittedAt: "2026-09-09T06:20:00.000Z",
      adapter,
    });

    const first = await emitDueFollowUpEvents({
      pool,
      workspaceId: "norautomatch",
      now: "2026-09-09T06:16:00.000Z",
      limit: 100,
    });
    const overdueEmission = first.find((item) => item.opportunityId === overdue.opportunityId);
    assert(overdueEmission?.status === "EMITTED", "Overdue unsatisfied obligation must emit CRM_FOLLOW_UP_DUE exactly once.");
    assert(!first.some((item) => item.opportunityId === future.opportunityId), "Future obligation must not emit before due time.");

    const replay = await emitDueFollowUpEvents({
      pool,
      workspaceId: "norautomatch",
      now: "2026-09-09T06:17:00.000Z",
      limit: 100,
    });
    const replayed = replay.find((item) => item.opportunityId === overdue.opportunityId);
    assert(replayed?.status === "DEDUPLICATED", "Repeated due scan must deduplicate deterministic due event identity.");

    const count = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM crm_outbox
        WHERE workspace_id = $1
          AND aggregate_id = $2
          AND event_type = 'CRM_FOLLOW_UP_DUE'`,
      ["norautomatch", overdue.opportunityId],
    );
    assert(count.rows[0]?.count === "1", "Repeated due scans must not create duplicate durable outbox rows.");

    await executeFirstContactAttemptCommand({
      pool,
      workspaceId: "norautomatch",
      opportunityId: overdue.opportunityId,
      evidenceRef: "sms-provider:message:due-satisfied-001",
      authority: "NORAUTO_SYSTEM",
      observedAt: "2026-09-09T06:18:00.000Z",
    });

    const afterSatisfaction = await emitDueFollowUpEvents({
      pool,
      workspaceId: "norautomatch",
      now: "2026-09-09T06:30:00.000Z",
      limit: 100,
    });
    assert(!afterSatisfaction.some((item) => item.opportunityId === overdue.opportunityId), "Satisfied obligation must stop participating in due scans.");
    assert(!afterSatisfaction.some((item) => item.opportunityId === future.opportunityId), "Future obligation remains not due at 06:30 when due at 06:35.");

    console.log("PASS_NODE_POSTGRES_IDEMPOTENT_FOLLOW_UP_DUE_EVENTS");
  } finally {
    await pool.end();
  }
}

run();
