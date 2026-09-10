import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { conversationEventSchema } from "../src/lib/conversation-gateway";
import { persistConversationEvent } from "../src/lib/conversation-gateway-persistence";
import { readConversationResponseQueue } from "../src/lib/conversation-response-queue";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base = {
  protocol: "IGNIAQUA_CONVERSATION_EVENT_V1" as const,
  workspaceId: "norautomatch",
  provider: "synthetic-provider",
  eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY" as const,
  customer: {
    name: "Synthetic Queue Customer",
    phone: "4055550188",
    email: "synthetic-queue@example.com",
    preferredContact: "TEXT" as const,
    communicationConsent: true as boolean | null,
  },
  intent: {
    category: "VEHICLE_INQUIRY",
    subjectRefs: ["synthetic-stock-queue"],
    questions: ["Is this vehicle available?"],
    constraints: ["Needs a response today."],
    urgency: "HIGH" as const,
  },
  summary: "Synthetic response-queue validation only.",
  evidence: {
    transcriptAvailable: false,
    sourceRef: "synthetic:conversation-response-queue",
    sourceHash: "c".repeat(64),
  },
  authorityEffect: "NONE" as const,
};

async function run() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required.");
  const pool = createPostgresCrmPool(connectionString);

  try {
    const contactable = conversationEventSchema.parse({
      ...base,
      conversationId: "synthetic-response-contactable",
      eventId: "synthetic-response-contactable-001",
      observedAt: "2026-09-10T09:00:00.000Z",
    });
    await persistConversationEvent({ pool, event: contactable });

    const newerSameConversation = conversationEventSchema.parse({
      ...base,
      conversationId: "synthetic-response-contactable",
      eventId: "synthetic-response-contactable-002",
      observedAt: "2026-09-10T09:01:00.000Z",
      summary: "Newest synthetic event for the same conversation.",
    });
    await persistConversationEvent({ pool, event: newerSameConversation });

    const review = conversationEventSchema.parse({
      ...base,
      conversationId: "synthetic-response-review",
      eventId: "synthetic-response-review-001",
      observedAt: "2026-09-10T09:02:00.000Z",
      customer: { ...base.customer, communicationConsent: null },
    });
    await persistConversationEvent({ pool, event: review });

    const notContactable = conversationEventSchema.parse({
      ...base,
      conversationId: "synthetic-response-no-route",
      eventId: "synthetic-response-no-route-001",
      observedAt: "2026-09-10T09:02:30.000Z",
      customer: { ...base.customer, phone: null, email: null },
    });
    await persistConversationEvent({ pool, event: notContactable });

    const otherWorkspace = conversationEventSchema.parse({
      ...base,
      workspaceId: "other-workspace",
      conversationId: "synthetic-response-other-workspace",
      eventId: "synthetic-response-other-workspace-001",
      observedAt: "2026-09-10T09:02:45.000Z",
    });
    await persistConversationEvent({ pool, event: otherWorkspace });

    const queue = await readConversationResponseQueue({
      pool,
      workspaceId: "norautomatch",
      limit: 100,
      now: new Date("2026-09-10T09:04:10.000Z"),
    });

    assert(queue.length === 2, "Queue must include one latest actionable row per conversation and exclude non-contactable/cross-workspace rows.");

    const newest = queue.find((item) => item.conversationId === "synthetic-response-contactable");
    assert(newest?.eventId === "synthetic-response-contactable-002", "Queue must expose only the newest event for a conversation.");
    assert(newest?.summary === "Newest synthetic event for the same conversation.", "Queue must preserve the newest normalized conversation context.");
    assert(newest?.routingDecision === "CONTACTABLE", "Contactable routing decision drifted.");
    assert(newest?.responseState === "RESPONSE_DUE", "Contactable conversation must carry a response obligation.");
    assert(newest?.slaState === "OVERDUE", "Contactable synthetic event should be overdue at the fixed validation clock.");
    assert(newest?.authorityEffect === "NONE", "Queue read model must grant no authority.");

    const reviewItem = queue.find((item) => item.conversationId === "synthetic-response-review");
    assert(reviewItem?.routingDecision === "HUMAN_REVIEW_REQUIRED", "Unproven consent must remain human-review required.");
    assert(reviewItem?.responseState === "HUMAN_REVIEW_DUE", "Human-review routing must not silently become outbound response permission.");
    assert(reviewItem?.customer.communicationConsent === null, "Queue must preserve unknown consent instead of coercing it to true.");

    assert(!queue.some((item) => item.conversationId === "synthetic-response-no-route"), "No-contact-route conversation must not appear in the actionable response queue.");
    assert(!queue.some((item) => item.workspaceId !== "norautomatch"), "Queue must remain tenant/workspace isolated.");

    console.log("PASS_CONVERSATION_RESPONSE_QUEUE_TRUTH_BOUNDARY");
  } finally {
    await pool.end();
  }
}

run();
