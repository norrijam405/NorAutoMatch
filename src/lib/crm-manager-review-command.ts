import type { Pool, PoolClient } from "pg";
import { applyManagerReviewReceipt, type CrmEvidenceRef, type CrmOpportunity } from "./crm-core";
import { createCrmOutboxEvent } from "./crm-outbox";
import type { ManagerDecision, ManagerHandoffEnvelope } from "./manager-handoff";
import { recordManagerReview, type ManagerActorEvidence } from "./manager-review-receipt";

export type ManagerReviewCommandResult =
  | {
      status: "APPLIED" | "DEDUPLICATED";
      opportunityId: string;
      receiptId: string;
      deskState: "MANAGER_ACKNOWLEDGED" | "RETURNED_FOR_CLARIFICATION";
      authorityEffect: "HANDOFF_REVIEW_ONLY";
    }
  | {
      status: "REJECTED";
      opportunityId: string;
      reason: "MANAGER_IDENTITY_NOT_VERIFIED";
      authorityEffect: "NONE";
    };

type OpportunityRow = {
  opportunity_id: string;
  intake_idempotency_key: string;
  pipeline: CrmOpportunity["pipeline"];
  stage: CrmOpportunity["stage"];
  desk_state: CrmOpportunity["deskState"];
  customer: CrmOpportunity["customer"];
  buying_intent: CrmOpportunity["buyingIntent"];
  inventory_evidence: CrmOpportunity["inventoryEvidence"];
  attribution: CrmOpportunity["attribution"];
  latest_handoff_id: string;
  latest_manager_receipt_id: string | null;
  outcome_type: "SOLD" | "LOST" | null;
  outcome_evidence_ref: string | null;
  created_at: Date;
  updated_at: Date;
  handoff_protocol: ManagerHandoffEnvelope["protocol"];
  handoff_idempotency_key: string;
  handoff_created_at: Date;
  workflow_state: ManagerHandoffEnvelope["workflowState"];
  desk_prep: ManagerHandoffEnvelope["deskPrep"];
  handoff_authority: ManagerHandoffEnvelope["authority"];
};

function requireWorkspaceId(workspaceId: string) {
  const normalized = workspaceId.trim();
  if (!normalized) throw new Error("Manager review command requires an explicit workspace boundary.");
  if (normalized.length > 128) throw new Error("Manager review workspace identifier exceeds supported length.");
  return normalized;
}

function requireOpportunityId(opportunityId: string) {
  const normalized = opportunityId.trim();
  if (!/^namo_[0-9a-f]{24}$/.test(normalized)) throw new Error("Manager review command requires a valid opportunity identifier.");
  return normalized;
}

async function loadLockedOpportunity(client: PoolClient, workspaceId: string, opportunityId: string) {
  const result = await client.query<OpportunityRow>(
    `SELECT
       o.opportunity_id, o.intake_idempotency_key, o.pipeline, o.stage, o.desk_state,
       o.customer, o.buying_intent, o.inventory_evidence, o.attribution,
       o.latest_handoff_id, o.latest_manager_receipt_id, o.outcome_type,
       o.outcome_evidence_ref, o.created_at, o.updated_at,
       h.protocol AS handoff_protocol, h.handoff_idempotency_key,
       h.created_at AS handoff_created_at, h.workflow_state,
       h.desk_prep, h.authority AS handoff_authority
     FROM crm_opportunities o
     JOIN crm_manager_handoffs h
       ON h.workspace_id = o.workspace_id
      AND h.opportunity_id = o.opportunity_id
      AND h.handoff_id = o.latest_handoff_id
     WHERE o.workspace_id = $1 AND o.opportunity_id = $2
     FOR UPDATE OF o`,
    [workspaceId, opportunityId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Manager review command could not resolve the requested workspace opportunity and handoff.");
  return row;
}

async function loadEvidence(client: PoolClient, workspaceId: string, opportunityId: string): Promise<CrmEvidenceRef[]> {
  const result = await client.query<{
    kind: CrmEvidenceRef["kind"];
    evidence_ref: string;
    observed_at: Date;
    authority: CrmEvidenceRef["authority"];
  }>(
    `SELECT kind, evidence_ref, observed_at, authority
     FROM crm_evidence
     WHERE workspace_id = $1 AND opportunity_id = $2
     ORDER BY observed_at, evidence_id`,
    [workspaceId, opportunityId],
  );
  return result.rows.map((row) => ({
    kind: row.kind,
    ref: row.evidence_ref,
    observedAt: row.observed_at.toISOString(),
    authority: row.authority,
  }));
}

function reconstructHandoff(row: OpportunityRow): ManagerHandoffEnvelope {
  return {
    protocol: row.handoff_protocol,
    handoffId: row.latest_handoff_id,
    idempotencyKey: row.handoff_idempotency_key,
    createdAt: row.handoff_created_at.toISOString(),
    workflowState: row.workflow_state,
    deskPrep: row.desk_prep,
    authority: row.handoff_authority,
  };
}

async function reconstructOpportunity(client: PoolClient, workspaceId: string, row: OpportunityRow): Promise<CrmOpportunity> {
  const evidence = await loadEvidence(client, workspaceId, row.opportunity_id);
  const outcomeEvidence = row.outcome_evidence_ref
    ? evidence.find((candidate) => candidate.ref === row.outcome_evidence_ref)
    : undefined;

  return {
    protocol: "NORAUTO_CRM_OPPORTUNITY_V1",
    opportunityId: row.opportunity_id,
    intakeIdempotencyKey: row.intake_idempotency_key,
    pipeline: row.pipeline,
    stage: row.stage,
    deskState: row.desk_state,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    customer: row.customer,
    buyingIntent: row.buying_intent,
    inventoryEvidence: row.inventory_evidence,
    latestHandoffId: row.latest_handoff_id,
    latestManagerReceiptId: row.latest_manager_receipt_id ?? undefined,
    attribution: row.attribution,
    evidence,
    outcome: row.outcome_type && outcomeEvidence
      ? { type: row.outcome_type, evidenceRef: outcomeEvidence }
      : undefined,
  };
}

function validateReviewable(row: OpportunityRow, expectedHandoffId?: string) {
  if (expectedHandoffId && expectedHandoffId !== row.latest_handoff_id) {
    throw new Error("Manager review refused a stale or unrelated handoff.");
  }
  if (row.stage === "SOLD" || row.stage === "LOST") {
    throw new Error("Manager review cannot mutate a terminal CRM opportunity.");
  }
  if (row.desk_state !== "MANAGER_REVIEW_PENDING") {
    throw new Error("Manager review requires a manager-review-pending opportunity.");
  }
  if (row.workflow_state !== "MANAGER_REVIEW_PENDING") {
    throw new Error("Manager review requires the exact pending immutable handoff.");
  }
  if (row.handoff_authority.approveDeal !== "NOT_AUTHORIZED") {
    throw new Error("Manager review refused a handoff carrying deal-approval authority.");
  }
}

async function findExistingReceipt(client: PoolClient, receiptId: string) {
  const result = await client.query<{
    receipt_id: string;
    opportunity_id: string;
    decision: ManagerDecision;
    truth_state: string;
  }>(
    `SELECT receipt_id, opportunity_id, decision, truth_state
     FROM crm_manager_review_receipts
     WHERE receipt_id = $1`,
    [receiptId],
  );
  return result.rows[0];
}

export async function executeManagerReviewCommand(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  expectedHandoffId?: string;
  decision: ManagerDecision;
  actor: ManagerActorEvidence;
  note?: string;
  recordedAt?: string;
}): Promise<ManagerReviewCommandResult> {
  const workspaceId = requireWorkspaceId(input.workspaceId);
  const opportunityId = requireOpportunityId(input.opportunityId);
  const client = await input.pool.connect();

  try {
    await client.query("BEGIN");
    const row = await loadLockedOpportunity(client, workspaceId, opportunityId);
    const handoff = reconstructHandoff(row);

    if (input.expectedHandoffId && input.expectedHandoffId !== row.latest_handoff_id) {
      throw new Error("Manager review refused a stale or unrelated handoff.");
    }

    const receipt = recordManagerReview({
      handoff,
      decision: input.decision,
      actor: input.actor,
      note: input.note,
      recordedAt: input.recordedAt,
    });

    if (receipt.status === "REJECTED") {
      await client.query("ROLLBACK");
      return {
        status: "REJECTED",
        opportunityId,
        reason: receipt.reason,
        authorityEffect: "NONE",
      };
    }

    const existing = await findExistingReceipt(client, receipt.receiptId);
    if (existing) {
      if (
        existing.opportunity_id !== opportunityId ||
        existing.decision !== receipt.decision ||
        existing.truth_state !== "VERIFIED_MANAGER_ACTION"
      ) {
        throw new Error("Manager review receipt identity collision does not match the expected review action.");
      }
      await client.query("COMMIT");
      return {
        status: "DEDUPLICATED",
        opportunityId,
        receiptId: receipt.receiptId,
        deskState: receipt.decision === "ACKNOWLEDGED" ? "MANAGER_ACKNOWLEDGED" : "RETURNED_FOR_CLARIFICATION",
        authorityEffect: "HANDOFF_REVIEW_ONLY",
      };
    }

    validateReviewable(row, input.expectedHandoffId);
    const opportunity = await reconstructOpportunity(client, workspaceId, row);
    const updated = applyManagerReviewReceipt({ opportunity, receipt });

    await client.query(
      `INSERT INTO crm_manager_review_receipts (
         receipt_id, workspace_id, opportunity_id, handoff_id, receipt_idempotency_key,
         decision, actor_subject_id, actor_verifier, actor_evidence_ref, truth_state, recorded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz)`,
      [
        receipt.receiptId,
        workspaceId,
        opportunityId,
        receipt.handoffId,
        receipt.idempotencyKey,
        receipt.decision,
        receipt.actor.subjectId,
        receipt.actor.verifier,
        receipt.actor.evidenceRef ?? null,
        receipt.truthState,
        receipt.recordedAt,
      ],
    );

    const updateResult = await client.query(
      `UPDATE crm_opportunities
       SET desk_state = $4, latest_manager_receipt_id = $5, updated_at = $6::timestamptz
       WHERE workspace_id = $1
         AND opportunity_id = $2
         AND latest_handoff_id = $3
         AND desk_state = 'MANAGER_REVIEW_PENDING'`,
      [workspaceId, opportunityId, row.latest_handoff_id, updated.deskState, receipt.receiptId, receipt.recordedAt],
    );
    if (updateResult.rowCount !== 1) throw new Error("Manager review lost the pending handoff state before mutation.");

    const outbox = createCrmOutboxEvent({
      opportunity: updated,
      eventType: "CRM_MANAGER_REVIEW_APPLIED",
      occurredAt: receipt.recordedAt,
      payload: {
        opportunityId,
        handoffId: receipt.handoffId,
        receiptId: receipt.receiptId,
        decision: receipt.decision,
        deskState: updated.deskState,
        truthState: receipt.truthState,
        authorityEffect: "HANDOFF_REVIEW_ONLY",
      },
    });

    await client.query(
      `INSERT INTO crm_outbox (
         event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
         pipeline, payload, occurred_at, delivery_state, attempts, max_attempts
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz, $9, $10, $11)`,
      [
        outbox.eventId,
        workspaceId,
        outbox.aggregateId,
        outbox.idempotencyKey,
        outbox.eventType,
        outbox.pipeline,
        outbox.payload,
        outbox.occurredAt,
        outbox.delivery.state,
        outbox.delivery.attempts,
        outbox.delivery.maxAttempts,
      ],
    );

    await client.query("COMMIT");
    return {
      status: "APPLIED",
      opportunityId,
      receiptId: receipt.receiptId,
      deskState: updated.deskState as "MANAGER_ACKNOWLEDGED" | "RETURNED_FOR_CLARIFICATION",
      authorityEffect: "HANDOFF_REVIEW_ONLY",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Manager review transaction failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
