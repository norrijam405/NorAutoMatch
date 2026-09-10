import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { conversationEventSchema } from "../src/lib/conversation-gateway";
import { persistConversationEvent } from "../src/lib/conversation-gateway-persistence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const event = conversationEventSchema.parse({
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
  workspaceId: "norautomatch",
  provider: "motive-ask-ai",
  conversationId: "synthetic-persistence-conversation-001",
  eventId: "synthetic-persistence-event-001",
  eventType: "CONTACT_INFORMATION_SUBMITTED",
  observedAt: "2026-09-10T08:50:00.000Z",
  customer: {
    name: "Synthetic Persistence Customer",
    phone: "4055550198",
    email: "synthetic-persistence@example.com",
    preferredContact: "TEXT",
    communicationConsent: true,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["synthetic-stock-persist-001"],
    questions: ["Please confirm current availability."],
    constraints: [],
    urgency: "HIGH",
  },
  summary: "Synthetic persistence test only.",
  evidence: {
    transcriptAvailable: false,
    sourceRef: "synthetic:motive:event:persist-001",
    sourceHash: "b".repeat(64),
  },
  authorityEffect: "NONE",
});

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required.");
  const pool = createPostgresCrmPool(connectionString);
  try {
    const first = await persistConversationEvent({ pool, event });
    assert(first.status === "COMMITTED", "First exact conversation event must commit.");
    assert(first.routingDecision === "CONTACTABLE", "Valid consent/contact/context should be contactable.");
    assert(first.authorityEffect === "NONE", "Persistence must not grant authority.");

    const replay = await persistConversationEvent({ pool, event });
    assert(replay.status === "DEDUPLICATED", "Exact conversation-event replay must deduplicate.");

    const durable = await pool.query<{
      count: string;
      routing_decision: string;
      processing_state: string;
      source_hash: string | null;
    }>(
      `SELECT COUNT(*) OVER ()::text AS count, routing_decision, processing_state, source_hash
         FROM crm_conversation_events
        WHERE workspace_id=$1 AND provider=$2 AND event_id=$3`,
      [event.workspaceId, event.provider, event.eventId],
    );
    assert(durable.rows.length === 1 && durable.rows[0]?.count === "1", "Event identity must exist durably exactly once.");
    assert(durable.rows[0]?.routing_decision === "CONTACTABLE", "Durable routing decision drifted.");
    assert(durable.rows[0]?.processing_state === "RECEIVED", "Durable intake must not claim downstream routing occurred.");
    assert(durable.rows[0]?.source_hash === "b".repeat(64), "Durable source provenance hash drifted.");

    let collisionRejected = false;
    try {
      await persistConversationEvent({
        pool,
        event: conversationEventSchema.parse({
          ...event,
          summary: "Changed payload under the same provider event identity.",
        }),
      });
    } catch (error) {
      collisionRejected = error instanceof Error && error.message.includes("CONVERSATION_EVENT_IDENTITY_COLLISION");
    }
    assert(collisionRejected, "Same provider event ID with changed payload must fail closed.");

    const afterCollision = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_conversation_events
        WHERE workspace_id=$1 AND provider=$2 AND event_id=$3`,
      [event.workspaceId, event.provider, event.eventId],
    );
    assert(afterCollision.rows[0]?.count === "1", "Rejected identity collision must not create another row.");

    console.log("PASS_CONVERSATION_GATEWAY_DURABLE_REPLAY_IDENTITY");
  } finally {
    await pool.end();
  }
}

run();
