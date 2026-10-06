import assert from "node:assert/strict";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { conversationEventSchema } from "../src/lib/conversation-gateway";
import { persistConversationEvent } from "../src/lib/conversation-gateway-persistence";
import { claimConversation } from "../src/lib/conversation-ownership";
import { readCommunicationHistory, recordCommunicationAction } from "../src/lib/conversation-communication-ledger";

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required.");
  const pool = createPostgresCrmPool(connectionString);
  const workspaceId = "communication-ledger-test";
  const provider = "NORAUTO_SITE_CHAT";
  const eventId = "communication-ledger-event-001";
  const conversationId = "communication-ledger-conversation-001";
  const actorSubjectId = "rep-test-001";

  try {
    await pool.query("delete from crm_conversation_contact_events where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_assignment_events where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_assignments where workspace_id=$1", [workspaceId]);
    await pool.query("delete from crm_conversation_events where workspace_id=$1", [workspaceId]);

    const event = conversationEventSchema.parse({
      protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
      workspaceId,
      provider,
      eventType: "CONVERSATION_ENDED_OR_HANDOFF_READY",
      eventId,
      conversationId,
      observedAt: "2026-10-05T15:00:00.000Z",
      customer: {
        name: "Synthetic Communication Customer",
        phone: "4055550199",
        email: "customer@example.com",
        preferredContact: "EMAIL",
        communicationConsent: true,
      },
      intent: {
        category: "VEHICLE_INQUIRY",
        subjectRefs: ["vin:1N4TEST00000000001"],
        questions: ["Can someone follow up?"],
        constraints: [],
        urgency: "NORMAL",
      },
      summary: "Synthetic communication ledger test.",
      evidence: {
        transcriptAvailable: false,
        sourceRef: "synthetic:communication-ledger",
        sourceHash: "c".repeat(64),
      },
      authorityEffect: "NONE",
    });

    assert.equal((await persistConversationEvent({ pool, event })).status, "COMMITTED");
    await claimConversation({ pool, workspaceId, provider, conversationId, actorSubjectId });

    await assert.rejects(
      recordCommunicationAction({
        pool, workspaceId, provider, eventId, actorSubjectId,
        channel: "TEXT", action: "HANDOFF_OPENED",
        clientActionId: "00000000-0000-4000-8000-000000000001",
      }),
      /PREFERRED_CONTACT_MISMATCH/,
    );

    const opened = await recordCommunicationAction({
      pool, workspaceId, provider, eventId, actorSubjectId,
      channel: "EMAIL", action: "HANDOFF_OPENED",
      clientActionId: "00000000-0000-4000-8000-000000000002",
    });
    assert.equal(opened.eventType, "CHANNEL_HANDOFF_OPENED");
    assert.equal(opened.executionState, "NOT_CLAIMED");
    assert.equal(opened.deliveryState, "NOT_CLAIMED");

    const replay = await recordCommunicationAction({
      pool, workspaceId, provider, eventId, actorSubjectId,
      channel: "EMAIL", action: "HANDOFF_OPENED",
      clientActionId: "00000000-0000-4000-8000-000000000002",
    });
    assert.equal(replay.status, "DEDUPLICATED");

    await assert.rejects(
      pool.query(
        `insert into crm_conversation_contact_events (
          client_action_id, workspace_id, provider, conversation_id, source_event_id,
          channel, event_type, actor_subject_id, target_hash, target_hint,
          evidence_authority, evidence_ref, delivery_outcome
        ) values (
          '00000000-0000-4000-8000-000000000101'::uuid,$1,$2,$3,'forged-source-event',
          'EMAIL','DELIVERY_EVIDENCE_RECORDED',$4,$5,'***@example.com',
          'PROVIDER_RECEIPT_REPORTED_BY_REP','fabricated-receipt','DELIVERED'
        )`,
        [workspaceId, provider, conversationId, actorSubjectId, "f".repeat(64)],
      ),
      /COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE/,
    );

    await assert.rejects(
      pool.query(
        `insert into crm_conversation_contact_events (
          client_action_id, workspace_id, provider, conversation_id, source_event_id,
          channel, event_type, actor_subject_id, target_hash, target_hint,
          evidence_authority, evidence_ref, delivery_outcome
        ) values (
          '00000000-0000-4000-8000-000000000102'::uuid,$1,$2,$3,$4,
          'EMAIL','DELIVERY_EVIDENCE_RECORDED',$5,$6,'***@example.com',
          'PROVIDER_RECEIPT_REPORTED_BY_REP','fabricated-receipt','DELIVERED'
        )`,
        [workspaceId, provider, conversationId, eventId, actorSubjectId, "e".repeat(64)],
      ),
      /COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED/,
    );

    const executed = await recordCommunicationAction({
      pool, workspaceId, provider, eventId, actorSubjectId,
      channel: "EMAIL", action: "EXECUTION_RECORDED",
      clientActionId: "00000000-0000-4000-8000-000000000003",
      evidenceRef: "synthetic-provider-message-id-001",
    });
    assert.equal(executed.executionState, "HUMAN_RECORDED");
    assert.equal(executed.deliveryState, "NOT_CLAIMED");

    const executionRow = await pool.query<{ target_hash: string }>(
      "select target_hash from crm_conversation_contact_events where communication_event_id=$1::uuid",
      [executed.communicationEventId],
    );
    const targetHash = executionRow.rows[0]?.target_hash;
    assert.ok(targetHash);

    await assert.rejects(
      recordCommunicationAction({
        pool, workspaceId, provider, eventId, actorSubjectId,
        channel: "EMAIL", action: "DELIVERY_EVIDENCE_RECORDED",
        clientActionId: "00000000-0000-4000-8000-000000000004",
        evidenceRef: "fabricated-provider-delivery-receipt",
        deliveryOutcome: "DELIVERED",
      }),
      /COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED/,
      "application path must not promote rep-entered receipt text to delivery truth",
    );

    await assert.rejects(
      pool.query(
        `insert into crm_conversation_contact_events (
          client_action_id, workspace_id, provider, conversation_id, source_event_id,
          channel, event_type, actor_subject_id, target_hash, target_hint,
          evidence_authority, evidence_ref, delivery_outcome
        ) values (
          '00000000-0000-4000-8000-000000000103'::uuid,$1,$2,$3,$4,
          'EMAIL','DELIVERY_EVIDENCE_RECORDED',$5,$6,'***@example.com',
          'PROVIDER_RECEIPT_REPORTED_BY_REP','fabricated-provider-delivery-receipt','DELIVERED'
        )`,
        [workspaceId, provider, conversationId, eventId, actorSubjectId, targetHash],
      ),
      /COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED/,
      "direct SQL must not promote arbitrary receipt text to delivery truth after valid execution",
    );

    let history = await readCommunicationHistory({ pool, workspaceId, provider, conversationId });
    assert.equal(history.events.length, 2);
    assert.equal(history.status.executionState, "HUMAN_RECORDED");
    assert.equal(history.status.deliveryState, "NOT_CLAIMED");
    assert.equal(history.status.customerReachedState, "NOT_CLAIMED");

    await pool.query("alter table crm_conversation_contact_events disable trigger crm_conversation_contact_events_insert_truth");
    await pool.query(
      `insert into crm_conversation_contact_events (
        client_action_id, workspace_id, provider, conversation_id, source_event_id,
        channel, event_type, actor_subject_id, target_hash, target_hint,
        evidence_authority, evidence_ref, delivery_outcome
      ) values (
        '00000000-0000-4000-8000-000000000104'::uuid,$1,$2,$3,$4,
        'EMAIL','DELIVERY_EVIDENCE_RECORDED',$5,$6,'***@example.com',
        'PROVIDER_RECEIPT_REPORTED_BY_REP','legacy-rep-reported-receipt','DELIVERED'
      )`,
      [workspaceId, provider, conversationId, eventId, actorSubjectId, targetHash],
    );
    await pool.query("alter table crm_conversation_contact_events enable trigger crm_conversation_contact_events_insert_truth");

    history = await readCommunicationHistory({ pool, workspaceId, provider, conversationId });
    assert.equal(history.events.length, 3);
    assert.equal(history.status.deliveryState, "NOT_CLAIMED");
    const legacy = history.events.find((event) => event.clientActionId === "00000000-0000-4000-8000-000000000104");
    assert.equal(legacy?.providerReceiptVerificationState, "UNVERIFIED_REP_REPORTED_REFERENCE");

    await assert.rejects(
      pool.query(
        `update crm_conversation_contact_events
            set evidence_ref = 'rewritten-provider-receipt'
          where communication_event_id = $1::uuid`,
        [executed.communicationEventId],
      ),
      /append-only/,
    );

    await assert.rejects(
      pool.query(
        `delete from crm_conversation_contact_events
          where communication_event_id = $1::uuid`,
        [executed.communicationEventId],
      ),
      /append-only/,
    );

    await assert.rejects(
      pool.query("truncate table crm_conversation_contact_events"),
      /cannot be truncated/,
    );

    history = await readCommunicationHistory({ pool, workspaceId, provider, conversationId });
    assert.equal(history.status.executionState, "HUMAN_RECORDED");
    assert.equal(history.status.deliveryState, "NOT_CLAIMED");
    const surviving = history.events.find((event) => event.communicationEventId === executed.communicationEventId);
    assert.equal(surviving?.evidenceRef, "synthetic-provider-message-id-001");
    assert.equal(surviving?.deliveryOutcome, null);

    console.log("PASS communication ledger fail-closed provider receipt truth");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
