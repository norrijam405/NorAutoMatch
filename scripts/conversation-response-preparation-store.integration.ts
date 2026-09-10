import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { conversationEventSchema } from "../src/lib/conversation-gateway";
import { persistConversationEvent } from "../src/lib/conversation-gateway-persistence";
import { readResponsePreparationPacket } from "../src/lib/conversation-response-preparation-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required.");
  const pool = createPostgresCrmPool(connectionString);
  const workspaceId = "response-preparation-store-test";

  try {
    const event = conversationEventSchema.parse({
      protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
      workspaceId,
      provider: "synthetic-provider",
      eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
      eventId: "prep-store-001",
      conversationId: "prep-store-conversation-001",
      observedAt: "2026-09-10T10:00:00.000Z",
      customer: {
        name: "Synthetic Prep Store Customer",
        phone: "4055550111",
        email: "prep-store@example.com",
        preferredContact: "EMAIL",
        communicationConsent: true,
      },
      intent: {
        category: "VEHICLE_INQUIRY",
        subjectRefs: ["stock:prep-store"],
        questions: ["Can you confirm availability?"],
        constraints: ["Needs morning follow-up."],
        urgency: "NORMAL",
      },
      summary: "Synthetic evidence-backed preparation lookup.",
      evidence: {
        transcriptAvailable: false,
        sourceRef: "synthetic:prep-store",
        sourceHash: "e".repeat(64),
      },
      authorityEffect: "NONE",
    });

    const persisted = await persistConversationEvent({ pool, event });
    assert(persisted.persistence === "COMMITTED", "Synthetic preparation event must commit before lookup.");

    const packet = await readResponsePreparationPacket({
      pool,
      workspaceId,
      provider: event.provider,
      eventId: event.eventId,
    });
    assert(packet !== null, "Exact persisted conversation evidence must produce a preparation packet.");
    assert(packet.eventId === event.eventId && packet.conversationId === event.conversationId, "Preparation identity drifted from persisted evidence.");
    assert(packet.customerStated.questions[0] === "Can you confirm availability?", "Customer question must survive exact evidence lookup.");
    assert(packet.outboundExecution === "NOT_PERFORMED", "Evidence lookup must not execute outbound communication.");
    assert(packet.authorityEffect === "DRAFT_PREPARATION_ONLY", "Evidence lookup must remain draft-only authority.");

    const crossWorkspace = await readResponsePreparationPacket({
      pool,
      workspaceId: "wrong-workspace",
      provider: event.provider,
      eventId: event.eventId,
    });
    assert(crossWorkspace === null, "Cross-workspace lookup must not return customer evidence.");

    const missing = await readResponsePreparationPacket({
      pool,
      workspaceId,
      provider: event.provider,
      eventId: "missing-event",
    });
    assert(missing === null, "Missing event must fail closed without invented preparation data.");

    await pool.query(
      `UPDATE crm_conversation_events
          SET processing_state = 'DEAD_LETTER'
        WHERE workspace_id = $1 AND provider = $2 AND event_id = $3`,
      [workspaceId, event.provider, event.eventId],
    );
    const deadLetter = await readResponsePreparationPacket({
      pool,
      workspaceId,
      provider: event.provider,
      eventId: event.eventId,
    });
    assert(deadLetter === null, "Dead-letter evidence must not be exposed as response-ready preparation.");

    console.log("PASS_CONVERSATION_RESPONSE_PREPARATION_STORE_BOUNDARY");
  } finally {
    await pool.end();
  }
}

run();
