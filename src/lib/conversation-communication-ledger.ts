import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { conversationEventSchema, type ConversationEvent } from "./conversation-gateway";

export const COMMUNICATION_LEDGER_PROTOCOL = "NORAUTO_COMMUNICATION_LEDGER_V1" as const;

export type CommunicationChannel = "EMAIL" | "TEXT" | "PHONE";
export type CommunicationAction = "HANDOFF_OPENED" | "EXECUTION_RECORDED" | "DELIVERY_EVIDENCE_RECORDED";
export type DeliveryOutcome = "DELIVERED" | "FAILED";

type EligibleConversation = {
  event: ConversationEvent;
  target: string;
  targetHint: string;
};

type ContactEventRow = {
  communication_event_id: string;
  client_action_id: string;
  channel: CommunicationChannel;
  event_type: "CHANNEL_HANDOFF_OPENED" | "OUTBOUND_EXECUTION_RECORDED" | "DELIVERY_EVIDENCE_RECORDED";
  actor_subject_id: string;
  target_hint: string;
  evidence_authority: "INTERNAL_UI" | "HUMAN_REP" | "PROVIDER_RECEIPT_REPORTED_BY_REP";
  evidence_ref: string | null;
  delivery_outcome: DeliveryOutcome | null;
  created_at: Date | string;
};

function normalizeEvidenceRef(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized || normalized.length > 512) throw new Error("COMMUNICATION_EVIDENCE_REF_REQUIRED");
  return normalized;
}

function targetFor(event: ConversationEvent, channel: CommunicationChannel) {
  if (event.customer.communicationConsent !== true) throw new Error("COMMUNICATION_CONSENT_REQUIRED");
  if (event.customer.preferredContact !== channel) throw new Error("PREFERRED_CONTACT_MISMATCH");

  if (channel === "EMAIL") {
    const email = event.customer.email?.trim().toLowerCase();
    if (!email) throw new Error("COMMUNICATION_TARGET_MISSING");
    const at = email.lastIndexOf("@");
    const domain = at >= 0 ? email.slice(at + 1) : "email";
    return { target: email, targetHint: "***@" + domain };
  }

  const phone = event.customer.phone?.trim();
  if (!phone) throw new Error("COMMUNICATION_TARGET_MISSING");
  const digits = phone.replace(/\D/g, "");
  return { target: phone, targetHint: "•••" + digits.slice(-4) };
}

async function loadEligibleConversation(client: PoolClient, input: {
  workspaceId: string;
  provider: string;
  eventId: string;
  actorSubjectId: string;
  channel: CommunicationChannel;
}): Promise<EligibleConversation> {
  const result = await client.query<{
    conversation_id: string;
    normalized_payload: unknown;
    processing_state: string;
  }>(
    `select conversation_id, normalized_payload, processing_state
       from crm_conversation_events
      where workspace_id=$1 and provider=$2 and event_id=$3
      limit 1
      for update`,
    [input.workspaceId, input.provider, input.eventId],
  );
  const row = result.rows[0];
  if (!row || row.processing_state === "DEAD_LETTER" || row.processing_state === "REDACTED") {
    throw new Error("COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE");
  }

  const event = conversationEventSchema.parse(row.normalized_payload);
  if (
    event.workspaceId !== input.workspaceId ||
    event.provider !== input.provider ||
    event.eventId !== input.eventId ||
    event.conversationId !== row.conversation_id
  ) throw new Error("COMMUNICATION_SOURCE_EVENT_PROVENANCE_DRIFT");

  const ownership = await client.query<{ assignment_state: string; assignee_subject_id: string | null }>(
    `select assignment_state, assignee_subject_id
       from crm_conversation_assignments
      where workspace_id=$1 and provider=$2 and conversation_id=$3
      limit 1
      for update`,
    [input.workspaceId, input.provider, event.conversationId],
  );
  const assignment = ownership.rows[0];
  if (!assignment || assignment.assignment_state !== "ASSIGNED" || assignment.assignee_subject_id !== input.actorSubjectId) {
    throw new Error("COMMUNICATION_CONVERSATION_OWNERSHIP_REQUIRED");
  }

  return { event, ...targetFor(event, input.channel) };
}

function eventType(action: CommunicationAction): ContactEventRow["event_type"] {
  if (action === "HANDOFF_OPENED") return "CHANNEL_HANDOFF_OPENED";
  if (action === "EXECUTION_RECORDED") return "OUTBOUND_EXECUTION_RECORDED";
  return "DELIVERY_EVIDENCE_RECORDED";
}

function authority(action: CommunicationAction): ContactEventRow["evidence_authority"] {
  if (action === "HANDOFF_OPENED") return "INTERNAL_UI";
  if (action === "EXECUTION_RECORDED") return "HUMAN_REP";
  return "PROVIDER_RECEIPT_REPORTED_BY_REP";
}

export async function recordCommunicationAction(input: {
  pool: Pool;
  workspaceId: string;
  provider: string;
  eventId: string;
  actorSubjectId: string;
  channel: CommunicationChannel;
  action: CommunicationAction;
  clientActionId: string;
  evidenceRef?: string;
  deliveryOutcome?: DeliveryOutcome;
}) {
  if (input.action === "DELIVERY_EVIDENCE_RECORDED") {
    throw new Error("COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED");
  }

  const client = await input.pool.connect();
  try {
    await client.query("begin");

    const existing = await client.query<ContactEventRow & { source_event_id: string; provider: string; conversation_id: string }>(
      `select communication_event_id, client_action_id, provider, conversation_id, source_event_id,
              channel, event_type, actor_subject_id, target_hint, evidence_authority,
              evidence_ref, delivery_outcome, created_at
         from crm_conversation_contact_events
        where workspace_id=$1 and client_action_id=$2::uuid
        limit 1
        for update`,
      [input.workspaceId, input.clientActionId],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      const expectedEvidenceRef = input.action === "HANDOFF_OPENED" ? null : normalizeEvidenceRef(input.evidenceRef);
      const expectedDeliveryOutcome = input.action === "DELIVERY_EVIDENCE_RECORDED" ? input.deliveryOutcome ?? null : null;
      if (
        row.provider !== input.provider ||
        row.source_event_id !== input.eventId ||
        row.channel !== input.channel ||
        row.event_type !== eventType(input.action) ||
        row.actor_subject_id !== input.actorSubjectId ||
        row.evidence_ref !== expectedEvidenceRef ||
        row.delivery_outcome !== expectedDeliveryOutcome
      ) throw new Error("COMMUNICATION_CLIENT_ACTION_IDENTITY_COLLISION");
      await client.query("commit");
      return {
        protocol: COMMUNICATION_LEDGER_PROTOCOL,
        status: "DEDUPLICATED" as const,
        communicationEventId: row.communication_event_id,
        conversationId: row.conversation_id,
        channel: row.channel,
        eventType: row.event_type,
        executionState: row.event_type === "OUTBOUND_EXECUTION_RECORDED" ? "HUMAN_RECORDED" as const : "NOT_CLAIMED" as const,
        deliveryState: row.event_type === "DELIVERY_EVIDENCE_RECORDED"
          ? (row.delivery_outcome === "DELIVERED" ? "DELIVERY_EVIDENCE_RECORDED_DELIVERED" as const : "DELIVERY_EVIDENCE_RECORDED_FAILED" as const)
          : "NOT_CLAIMED" as const,
        customerReachedState: "NOT_CLAIMED" as const,
        authorityEffect: "COMMUNICATION_EVIDENCE_ONLY" as const,
      };
    }

    const eligible = await loadEligibleConversation(client, input);
    const ref = input.action === "HANDOFF_OPENED" ? null : normalizeEvidenceRef(input.evidenceRef);
    if (input.action === "DELIVERY_EVIDENCE_RECORDED") {
      if (input.channel === "PHONE") throw new Error("PHONE_DELIVERY_RECEIPT_NOT_SUPPORTED");
      if (input.deliveryOutcome !== "DELIVERED" && input.deliveryOutcome !== "FAILED") {
        throw new Error("DELIVERY_OUTCOME_REQUIRED");
      }
    } else if (input.deliveryOutcome !== undefined) {
      throw new Error("DELIVERY_OUTCOME_NOT_ALLOWED");
    }

    const targetHash = createHash("sha256").update(eligible.target).digest("hex");
    const inserted = await client.query<ContactEventRow>(
      `insert into crm_conversation_contact_events (
        client_action_id, workspace_id, provider, conversation_id, source_event_id,
        channel, event_type, actor_subject_id, target_hash, target_hint,
        evidence_authority, evidence_ref, delivery_outcome
      ) values ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      returning communication_event_id, client_action_id, channel, event_type,
                actor_subject_id, target_hint, evidence_authority, evidence_ref,
                delivery_outcome, created_at`,
      [
        input.clientActionId,
        input.workspaceId,
        input.provider,
        eligible.event.conversationId,
        input.eventId,
        input.channel,
        eventType(input.action),
        input.actorSubjectId,
        targetHash,
        eligible.targetHint,
        authority(input.action),
        ref,
        input.action === "DELIVERY_EVIDENCE_RECORDED" ? input.deliveryOutcome : null,
      ],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error("COMMUNICATION_LEDGER_INSERT_FAILED");
    await client.query("commit");

    return {
      protocol: COMMUNICATION_LEDGER_PROTOCOL,
      status: "COMMITTED" as const,
      communicationEventId: row.communication_event_id,
      conversationId: eligible.event.conversationId,
      channel: row.channel,
      eventType: row.event_type,
      executionState: row.event_type === "OUTBOUND_EXECUTION_RECORDED" ? "HUMAN_RECORDED" as const : "NOT_CLAIMED" as const,
      deliveryState: row.event_type === "DELIVERY_EVIDENCE_RECORDED"
        ? (row.delivery_outcome === "DELIVERED" ? "DELIVERY_EVIDENCE_RECORDED_DELIVERED" as const : "DELIVERY_EVIDENCE_RECORDED_FAILED" as const)
        : "NOT_CLAIMED" as const,
      customerReachedState: "NOT_CLAIMED" as const,
      authorityEffect: "COMMUNICATION_EVIDENCE_ONLY" as const,
    };
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function readCommunicationHistory(input: {
  pool: Pool;
  workspaceId: string;
  provider: string;
  conversationId: string;
}) {
  const result = await input.pool.query<ContactEventRow>(
    `select communication_event_id, client_action_id, channel, event_type,
            actor_subject_id, target_hint, evidence_authority, evidence_ref,
            delivery_outcome, created_at
       from crm_conversation_contact_events
      where workspace_id=$1 and provider=$2 and conversation_id=$3
      order by created_at, communication_event_id`,
    [input.workspaceId, input.provider, input.conversationId],
  );

  let executionState: "NOT_CLAIMED" | "HUMAN_RECORDED" = "NOT_CLAIMED";
  const deliveryState = "NOT_CLAIMED" as const;
  for (const row of result.rows) {
    if (row.event_type === "OUTBOUND_EXECUTION_RECORDED") executionState = "HUMAN_RECORDED";
  }

  return {
    protocol: "NORAUTO_COMMUNICATION_HISTORY_V1" as const,
    truthState: "APPEND_ONLY_EVIDENCE_READ_MODEL" as const,
    status: {
      executionState,
      deliveryState,
      customerReachedState: "NOT_CLAIMED" as const,
    },
    events: result.rows.map((row) => ({
      communicationEventId: row.communication_event_id,
      clientActionId: row.client_action_id,
      channel: row.channel,
      eventType: row.event_type,
      actorSubjectId: row.actor_subject_id,
      targetHint: row.target_hint,
      evidenceAuthority: row.evidence_authority,
      evidenceRef: row.evidence_ref,
      deliveryOutcome: row.delivery_outcome,
      providerReceiptVerificationState: row.event_type === "DELIVERY_EVIDENCE_RECORDED"
        ? "UNVERIFIED_REP_REPORTED_REFERENCE" as const
        : null,
      createdAt: new Date(row.created_at).toISOString(),
      customerReachedState: "NOT_CLAIMED" as const,
      authorityEffect: "COMMUNICATION_EVIDENCE_ONLY" as const,
    })),
    authorityEffect: "NONE" as const,
  };
}
