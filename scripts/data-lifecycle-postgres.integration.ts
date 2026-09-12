import assert from "node:assert/strict";
import { Pool } from "pg";
import { persistConversationEvent } from "../src/lib/conversation-gateway-persistence";
import type { ConversationEvent } from "../src/lib/conversation-gateway";
import { readResponsePreparationPacket } from "../src/lib/conversation-response-preparation-store";
import { claimCrmOutboxBatch, deliverClaimedCrmOutboxEvent } from "../src/lib/crm-outbox-relay";
import { readFollowUpQueue } from "../src/lib/crm-follow-up";
import { readPendingManagerQueue } from "../src/lib/crm-manager-queue";
import {
  attachConversationRedactionTarget,
  executePrimaryRedaction,
  placeLegalHold,
  requestPrimaryRedaction,
  resolveBackupDisposition,
} from "../src/lib/data-lifecycle-postgres";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for data lifecycle integration.");

const pool = new Pool({ connectionString, max: 4 });
const workspaceId = "lifecycle-integration";
const opportunityId = "namo_aaaaaaaaaaaaaaaaaaaaaaaa";
const heldOpportunityId = "namo_bbbbbbbbbbbbbbbbbbbbbbbb";
const raceOpportunityId = "namo_cccccccccccccccccccccccc";
const handoffId = "namh_cccccccccccccccccccccccc";
const heldHandoffId = "namh_dddddddddddddddddddddddd";
const pii = {
  name: "Lifecycle Test Customer",
  email: "lifecycle.customer@example.test",
  phone: "+14055550199",
  notes: "Call after 6pm about trade VIN-like details",
};

function eventPayload(eventId: string, conversationId: string): ConversationEvent {
  return {
    protocol: "IGNIAQUA_CONVERSATION_EVENT_V1",
    workspaceId,
    provider: "integration-provider",
    conversationId,
    eventId,
    eventType: "CONTACT_INFORMATION_SUBMITTED",
    observedAt: "2026-09-12T03:00:00.000Z",
    customer: {
      name: pii.name,
      phone: pii.phone,
      email: pii.email,
      preferredContact: "EMAIL",
      communicationConsent: true,
    },
    intent: {
      category: "vehicle-shopping",
      subjectRefs: ["vehicle:test"],
      questions: ["Is this vehicle available?"],
      constraints: ["under stated budget"],
      urgency: "NORMAL",
    },
    summary: pii.notes,
    evidence: {
      transcriptAvailable: false,
      sourceRef: "integration:event",
      sourceHash: null,
    },
    authorityEffect: "NONE",
  };
}

async function seedOpportunity(id: string, latestHandoffId: string, idempotencyDigit: string) {
  await pool.query(
    `INSERT INTO crm_opportunities (
      opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
      customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'Standard Retail', 'NEW', 'MANAGER_REVIEW_PENDING',
      $4::jsonb, $5::jsonb, '{}'::jsonb, $6::jsonb, $7,
      '2026-09-12T03:00:00Z', '2026-09-12T03:00:00Z'
    )`,
    [
      id,
      workspaceId,
      idempotencyDigit.repeat(64),
      JSON.stringify({ firstName: "Lifecycle", lastName: "Customer", email: pii.email, phone: pii.phone, consent: true }),
      JSON.stringify({ budgetRange: "$20k-$30k", paymentMethod: "FINANCE", tradeIn: "2018 sedan", notes: pii.notes }),
      JSON.stringify({ source: "integration-test", campaign: pii.name }),
      latestHandoffId,
    ],
  );

  await pool.query(
    `INSERT INTO crm_manager_handoffs (
       handoff_id, workspace_id, opportunity_id, handoff_idempotency_key,
       protocol, workflow_state, desk_prep, authority, created_at
     ) VALUES (
       $1, $2, $3, $4,
       'NORAUTO_MANAGER_HANDOFF_V1', 'MANAGER_REVIEW_PENDING', $5::jsonb, $6::jsonb, '2026-09-12T03:00:00Z'
     )`,
    [
      latestHandoffId,
      workspaceId,
      id,
      (idempotencyDigit === "1" ? "3" : "4").repeat(64),
      JSON.stringify({
        protocol: "NORAUTO_DESK_PREP_V1",
        customer: { name: pii.name, email: pii.email, phone: pii.phone },
        buyingLane: { budgetRange: "$20k-$30k", paymentMethod: "FINANCE", truthState: "CUSTOMER_STATED" },
        trade: { customerStatement: "2018 sedan", valuationAuthority: "MANAGER_OR_APPROVED_TRADE_PROCESS_ONLY", truthState: "CUSTOMER_STATED" },
        vehicleEvidence: {},
        notes: pii.notes,
        authority: {},
        managerReviewRequired: true,
      }),
      JSON.stringify({
        approveDeal: "NOT_AUTHORIZED",
        finalSellingPrice: "NOT_AUTHORIZED",
        financingApproval: "NOT_AUTHORIZED",
        paymentCommitment: "NOT_AUTHORIZED",
        tradeValuation: "NOT_AUTHORIZED",
        lenderSelection: "NOT_AUTHORIZED",
      }),
    ],
  );
}

async function seedRaceOpportunity() {
  await pool.query(
    `INSERT INTO crm_opportunities (
      opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
      customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, 'Standard Retail', 'NEW', 'NOT_PREPARED',
      $4::jsonb, $5::jsonb, '{}'::jsonb, '{}'::jsonb, 'namh_eeeeeeeeeeeeeeeeeeeeeeee',
      '2026-09-12T03:00:00Z', '2026-09-12T03:00:00Z'
    )`,
    [
      raceOpportunityId,
      workspaceId,
      "6".repeat(64),
      JSON.stringify({ firstName: "Hold", lastName: "Race", email: "hold.race@example.test", phone: "+14055550188", consent: true }),
      JSON.stringify({ budgetRange: "$20k-$30k", paymentMethod: "FINANCE", notes: "race fixture" }),
    ],
  );
}

async function proveLegalHoldWinsConcurrentFirstInsertRace() {
  await seedRaceOpportunity();
  const holdClient = await pool.connect();
  try {
    await holdClient.query("BEGIN");
    await holdClient.query(
      `INSERT INTO crm_data_lifecycle (
         workspace_id, opportunity_id, state,
         legal_hold_ref, legal_hold_authority, legal_hold_observed_at,
         backup_disposition, external_copies, authority_effect
       ) VALUES ($1, $2, 'LEGAL_HOLD', $3, $4, $5::timestamptz, 'UNKNOWN', 'NOT_KNOWN', 'NONE')`,
      [
        workspaceId,
        raceOpportunityId,
        "legal-hold:race-001",
        "COUNSEL_DIRECTION",
        "2026-09-12T03:40:00Z",
      ],
    );

    const redactionAttempt = requestPrimaryRedaction({
      pool,
      workspaceId,
      opportunityId: raceOpportunityId,
      requestRef: "privacy-request:race-001",
      requestAuthority: "VERIFIED_CUSTOMER_REQUEST",
      requestedAt: "2026-09-12T03:40:01Z",
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    await holdClient.query("COMMIT");

    await assert.rejects(redactionAttempt, /DATA_LIFECYCLE_REQUEST_REFUSED_FROM_LEGAL_HOLD/);
  } catch (error) {
    try { await holdClient.query("ROLLBACK"); } catch { /* transaction may already be committed */ }
    throw error;
  } finally {
    holdClient.release();
  }

  const finalState = await pool.query<{
    state: string;
    legal_hold_ref: string | null;
    request_ref: string | null;
  }>(
    `SELECT state, legal_hold_ref, request_ref
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2`,
    [workspaceId, raceOpportunityId],
  );
  assert.equal(finalState.rowCount, 1);
  assert.equal(finalState.rows[0].state, "LEGAL_HOLD");
  assert.equal(finalState.rows[0].legal_hold_ref, "legal-hold:race-001");
  assert.equal(finalState.rows[0].request_ref, null, "concurrent redaction must not overwrite or attach request state to the legal hold");

  await assert.rejects(
    executePrimaryRedaction({
      pool,
      workspaceId,
      opportunityId: raceOpportunityId,
      redactedAt: "2026-09-12T03:41:00Z",
    }),
    /DATA_LIFECYCLE_BLOCKED_BY_LEGAL_HOLD/,
  );
}

async function main() {
  await seedOpportunity(opportunityId, handoffId, "1");
  await seedOpportunity(heldOpportunityId, heldHandoffId, "2");

  await pool.query(
    `INSERT INTO crm_follow_up_obligations (
       workspace_id, opportunity_id, obligation_type, due_at
     ) VALUES ($1, $2, 'FIRST_CONTACT', '2026-09-12T03:15:00Z')`,
    [workspaceId, opportunityId],
  );

  await pool.query(
    `INSERT INTO crm_outbox (
       event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
       pipeline, payload, occurred_at, delivery_state, attempts, max_attempts
     ) VALUES (
       'name_eeeeeeeeeeeeeeeeeeeeeeee', $1, $2, $3,
       'CRM_OPPORTUNITY_CREATED', 'Standard Retail', $4::jsonb,
       '2026-09-12T03:00:00Z', 'PENDING', 0, 8
     )`,
    [workspaceId, opportunityId, "5".repeat(64), JSON.stringify({ customerEmail: pii.email, notes: pii.notes })],
  );

  const targetedEventId = "event-targeted";
  const unlinkedEventId = "event-unlinked";
  for (const [eventId, conversationId] of [[targetedEventId, "conversation-targeted"], [unlinkedEventId, "conversation-unlinked"]] as const) {
    await pool.query(
      `INSERT INTO crm_conversation_events (
         workspace_id, provider, event_id, conversation_id, event_type,
         observed_at, normalized_payload, routing_decision, routing_reasons, processing_state
       ) VALUES ($1, 'integration-provider', $2, $3, 'CONTACT_INFORMATION_SUBMITTED',
         '2026-09-12T03:00:00Z', $4::jsonb, 'CONTACTABLE', '["CONTACT_ROUTE_AND_CONSENT_PRESENT"]'::jsonb, 'RECEIVED')`,
      [workspaceId, eventId, conversationId, JSON.stringify(eventPayload(eventId, conversationId))],
    );
  }

  await requestPrimaryRedaction({
    pool,
    workspaceId,
    opportunityId,
    requestRef: "privacy-request:integration-001",
    requestAuthority: "VERIFIED_CUSTOMER_REQUEST",
    requestedAt: "2026-09-12T03:10:00Z",
    externalCopies: "MAY_EXIST",
  });
  await attachConversationRedactionTarget({
    pool,
    workspaceId,
    opportunityId,
    provider: "integration-provider",
    eventId: targetedEventId,
    targetRef: "privacy-request:integration-001:conversation-target",
  });

  const preRedactionClaims = await claimCrmOutboxBatch({ pool, limit: 1, leaseSeconds: 30 });
  assert.equal(preRedactionClaims.length, 1, "pre-redaction race fixture must hold one claimed event");
  assert.equal(preRedactionClaims[0].aggregateId, opportunityId);

  const receipt = await executePrimaryRedaction({
    pool,
    workspaceId,
    opportunityId,
    redactedAt: "2026-09-12T03:20:00Z",
  });
  assert.equal(receipt.conversationTargetsRedacted, 1);
  assert.equal(receipt.localConversationTruth, "EXPLICIT_TARGETS_REDACTED_SCOPE_NOT_PROVEN_COMPLETE");
  assert.equal(receipt.backupTruth, "PENDING_SEPARATE_DISPOSITION");
  assert.equal(receipt.externalCopyTruth, "MAY_EXIST");
  assert.equal(receipt.authorityEffect, "NONE");

  let staleClaimNetworkCalls = 0;
  const staleClaimOutcome = await deliverClaimedCrmOutboxEvent({
    pool,
    event: preRedactionClaims[0],
    targetUrl: "https://example.invalid/redacted-lead",
    fetchImpl: (async () => {
      staleClaimNetworkCalls += 1;
      return new Response(null, { status: 204 });
    }) as typeof fetch,
  });
  assert.equal(staleClaimOutcome.status, "SUPPRESSED");
  assert.equal(staleClaimNetworkCalls, 0, "stale pre-redaction claim must never reach the network after redaction wins");

  const opportunity = await pool.query(`SELECT customer, buying_intent, attribution FROM crm_opportunities WHERE workspace_id = $1 AND opportunity_id = $2`, [workspaceId, opportunityId]);
  const opportunityText = JSON.stringify(opportunity.rows[0]);
  assert(!opportunityText.includes(pii.email));
  assert(!opportunityText.includes(pii.phone));
  assert(!opportunityText.includes(pii.notes));
  assert.deepEqual(opportunity.rows[0].customer, { redacted: true });

  const handoff = await pool.query(`SELECT desk_prep FROM crm_manager_handoffs WHERE workspace_id = $1 AND opportunity_id = $2`, [workspaceId, opportunityId]);
  assert.deepEqual(handoff.rows[0].desk_prep, { protocol: "NORAUTO_DESK_PREP_V1", redacted: true });

  const outbox = await pool.query(`SELECT payload, delivery_state FROM crm_outbox WHERE workspace_id = $1 AND aggregate_id = $2`, [workspaceId, opportunityId]);
  assert.deepEqual(outbox.rows[0].payload, { redacted: true, reason: "DATA_LIFECYCLE_PRIMARY_REDACTION" });
  assert.equal(outbox.rows[0].delivery_state, "SUPPRESSED");
  assert.equal((await claimCrmOutboxBatch({ pool, limit: 10 })).length, 0);

  const targeted = await pool.query(`SELECT normalized_payload, processing_state FROM crm_conversation_events WHERE workspace_id = $1 AND event_id = $2`, [workspaceId, targetedEventId]);
  assert.equal(targeted.rows[0].processing_state, "REDACTED");
  assert(!JSON.stringify(targeted.rows[0].normalized_payload).includes(pii.email));
  assert.equal(
    await readResponsePreparationPacket({ pool, workspaceId, provider: "integration-provider", eventId: targetedEventId }),
    null,
  );

  const replay = await persistConversationEvent({
    pool,
    event: eventPayload(targetedEventId, "conversation-targeted"),
  });
  assert.equal(replay.status, "DEDUPLICATED");
  assert.equal(replay.processingState, "REDACTED");
  assert.equal(replay.routingDecision, "NOT_CONTACTABLE");
  const targetedAfterReplay = await pool.query(`SELECT normalized_payload FROM crm_conversation_events WHERE workspace_id = $1 AND event_id = $2`, [workspaceId, targetedEventId]);
  assert(!JSON.stringify(targetedAfterReplay.rows[0].normalized_payload).includes(pii.email));

  const unlinked = await pool.query(`SELECT normalized_payload, processing_state FROM crm_conversation_events WHERE workspace_id = $1 AND event_id = $2`, [workspaceId, unlinkedEventId]);
  assert.equal(unlinked.rows[0].processing_state, "RECEIVED");
  assert(JSON.stringify(unlinked.rows[0].normalized_payload).includes(pii.email));

  assert.equal((await readPendingManagerQueue({ pool, workspaceId })).some((item) => item.opportunityId === opportunityId), false);
  assert.equal((await readFollowUpQueue({ pool, workspaceId, now: "2026-09-12T03:30:00Z" })).some((item) => item.opportunityId === opportunityId), false);

  await assert.rejects(
    pool.query(`UPDATE crm_opportunities SET stage = 'CONTACT_PENDING' WHERE workspace_id = $1 AND opportunity_id = $2`, [workspaceId, opportunityId]),
    /DATA_LIFECYCLE_OPERATION_SUPPRESSED/,
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO crm_evidence (workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at, payload)
       VALUES ($1, $2, 'CONTACT_ATTEMPT', 'post-redaction-attempt', 'NORAUTO_SYSTEM', '2026-09-12T03:30:00Z', '{}'::jsonb)`,
      [workspaceId, opportunityId],
    ),
    /DATA_LIFECYCLE_OPERATION_SUPPRESSED/,
  );

  await placeLegalHold({
    pool,
    workspaceId,
    opportunityId: heldOpportunityId,
    legalHoldRef: "legal-hold:integration-001",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T03:15:00Z",
  });
  await assert.rejects(
    executePrimaryRedaction({
      pool,
      workspaceId,
      opportunityId: heldOpportunityId,
      redactedAt: "2026-09-12T03:25:00Z",
    }),
    /DATA_LIFECYCLE_BLOCKED_BY_LEGAL_HOLD|DATA_LIFECYCLE_REDACTION_REQUEST_NOT_EVIDENCE_BOUND/,
  );
  const held = await pool.query(`SELECT customer FROM crm_opportunities WHERE workspace_id = $1 AND opportunity_id = $2`, [workspaceId, heldOpportunityId]);
  assert(JSON.stringify(held.rows[0].customer).includes(pii.email));

  await proveLegalHoldWinsConcurrentFirstInsertRace();

  const resolved = await resolveBackupDisposition({
    pool,
    workspaceId,
    opportunityId,
    dispositionRef: "backup-policy:expired-2026-10-12",
    dispositionAuthority: "AUTHORIZED_BACKUP_DISPOSITION",
    observedAt: "2026-10-12T00:00:00Z",
  });
  assert.equal(resolved.state, "PRIMARY_REDACTED_BACKUP_EXPIRED");
  assert.equal(resolved.backupDisposition, "EXPIRED_OR_PURGED");
  assert.equal(resolved.backupDispositionAuthority, "AUTHORIZED_BACKUP_DISPOSITION");

  const immutableReceipt = await pool.query(`SELECT receipt_id FROM crm_data_lifecycle_redaction_receipts WHERE workspace_id = $1 AND opportunity_id = $2`, [workspaceId, opportunityId]);
  assert.equal(immutableReceipt.rowCount, 1);
  await assert.rejects(
    pool.query(`DELETE FROM crm_data_lifecycle_redaction_receipts WHERE receipt_id = $1`, [immutableReceipt.rows[0].receipt_id]),
    /immutable evidence\/receipt rows cannot be updated or deleted/,
  );

  console.log("data lifecycle postgres integration: PASS");
}

main()
  .finally(async () => pool.end())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
