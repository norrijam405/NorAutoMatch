import type { Pool, PoolClient } from "pg";
import { advanceCrmOpportunity, type CrmEvidenceRef, type CrmOpportunity } from "./crm-core";
import { createCrmOutboxEvent } from "./crm-outbox";

export type ContactConfirmationAuthority = Extract<CrmEvidenceRef["authority"], "MANAGER" | "DEALERSHIP_SYSTEM">;

export type ContactConfirmationResult = {
  status: "APPLIED" | "DEDUPLICATED";
  opportunityId: string;
  stage: CrmOpportunity["stage"];
  evidenceRef: string;
  authorityEffect: "CONTACT_CONFIRMED_ONLY";
};

type LockedOpportunityRow = {
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
};

function requireWorkspaceId(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) throw new Error("Contact confirmation requires a valid workspace boundary.");
  return normalized;
}

function requireOpportunityId(value: string) {
  const normalized = value.trim();
  if (!/^namo_[0-9a-f]{24}$/.test(normalized)) throw new Error("Contact confirmation requires a valid opportunity identifier.");
  return normalized;
}

function requireEvidenceRef(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 512) throw new Error("Contact confirmation requires a bounded evidence reference.");
  return normalized;
}

function requireObservedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Contact confirmation observation time is invalid.");
  return date.toISOString();
}

async function loadLockedOpportunity(client: PoolClient, workspaceId: string, opportunityId: string) {
  const result = await client.query<LockedOpportunityRow>(
    `SELECT opportunity_id, intake_idempotency_key, pipeline, stage, desk_state,
            customer, buying_intent, inventory_evidence, attribution,
            latest_handoff_id, latest_manager_receipt_id, outcome_type,
            outcome_evidence_ref, created_at, updated_at
       FROM crm_opportunities
      WHERE workspace_id = $1 AND opportunity_id = $2
      FOR UPDATE`,
    [workspaceId, opportunityId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Contact confirmation could not resolve the requested workspace opportunity.");
  return row;
}

async function loadEvidence(client: PoolClient, workspaceId: string, opportunityId: string): Promise<CrmEvidenceRef[]> {
  const result = await client.query<{
    kind: CrmEvidenceRef["kind"];
    evidence_ref: string;
    authority: CrmEvidenceRef["authority"];
    observed_at: Date;
  }>(
    `SELECT kind, evidence_ref, authority, observed_at
       FROM crm_evidence
      WHERE workspace_id = $1 AND opportunity_id = $2
      ORDER BY observed_at, evidence_id`,
    [workspaceId, opportunityId],
  );
  return result.rows.map((row) => ({
    kind: row.kind,
    ref: row.evidence_ref,
    authority: row.authority,
    observedAt: row.observed_at.toISOString(),
  }));
}

async function reconstructOpportunity(client: PoolClient, workspaceId: string, row: LockedOpportunityRow): Promise<CrmOpportunity> {
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

async function findConfirmation(client: PoolClient, workspaceId: string, opportunityId: string, evidenceRef: string) {
  const result = await client.query<{ authority: CrmEvidenceRef["authority"]; observed_at: Date }>(
    `SELECT authority, observed_at
       FROM crm_evidence
      WHERE workspace_id = $1
        AND opportunity_id = $2
        AND kind = 'CONTACT_CONFIRMED'
        AND evidence_ref = $3`,
    [workspaceId, opportunityId, evidenceRef],
  );
  return result.rows[0];
}

export async function executeContactConfirmationCommand(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  evidenceRef: string;
  authority: ContactConfirmationAuthority;
  observedAt: string;
}): Promise<ContactConfirmationResult> {
  const workspaceId = requireWorkspaceId(input.workspaceId);
  const opportunityId = requireOpportunityId(input.opportunityId);
  const evidenceRef = requireEvidenceRef(input.evidenceRef);
  const observedAt = requireObservedAt(input.observedAt);
  const client = await input.pool.connect();

  try {
    await client.query("BEGIN");
    const row = await loadLockedOpportunity(client, workspaceId, opportunityId);
    const existing = await findConfirmation(client, workspaceId, opportunityId, evidenceRef);

    if (existing) {
      if (existing.authority !== input.authority || existing.observed_at.toISOString() !== observedAt) {
        throw new Error("Contact-confirmation evidence identity collision does not match the supplied evidence.");
      }
      if (row.stage === "NEW" || row.stage === "CONTACT_PENDING") {
        throw new Error("Confirmed-contact evidence exists without the expected durable stage advancement.");
      }
      await client.query("COMMIT");
      return {
        status: "DEDUPLICATED",
        opportunityId,
        stage: row.stage,
        evidenceRef,
        authorityEffect: "CONTACT_CONFIRMED_ONLY",
      };
    }

    if (row.stage !== "CONTACT_PENDING") {
      throw new Error("Contact confirmation requires a CONTACT_PENDING opportunity.");
    }

    const evidence: CrmEvidenceRef = {
      kind: "CONTACT_CONFIRMED",
      ref: evidenceRef,
      authority: input.authority,
      observedAt,
    };
    const opportunity = await reconstructOpportunity(client, workspaceId, row);
    const updated = advanceCrmOpportunity({
      opportunity,
      to: "CONTACTED",
      actor: input.authority,
      evidence,
      observedAt,
    });

    await client.query(
      `INSERT INTO crm_evidence (
         workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at, payload
       ) VALUES ($1, $2, 'CONTACT_CONFIRMED', $3, $4, $5::timestamptz, $6::jsonb)`,
      [workspaceId, opportunityId, evidenceRef, input.authority, observedAt, { truthState: "CONFIRMED_CONTACT" }],
    );

    const update = await client.query(
      `UPDATE crm_opportunities
          SET stage = 'CONTACTED', updated_at = $3::timestamptz
        WHERE workspace_id = $1 AND opportunity_id = $2 AND stage = 'CONTACT_PENDING'`,
      [workspaceId, opportunityId, observedAt],
    );
    if (update.rowCount !== 1) throw new Error("Contact confirmation lost the CONTACT_PENDING state before mutation.");

    const outbox = createCrmOutboxEvent({
      opportunity: updated,
      eventType: "CRM_OPPORTUNITY_STAGE_CHANGED",
      occurredAt: observedAt,
      payload: {
        opportunityId,
        from: "CONTACT_PENDING",
        to: "CONTACTED",
        reason: "CONTACT_CONFIRMED_EVIDENCE_RECORDED",
        evidenceRef,
        authority: input.authority,
        authorityEffect: "CONTACT_CONFIRMED_ONLY",
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
      stage: "CONTACTED",
      evidenceRef,
      authorityEffect: "CONTACT_CONFIRMED_ONLY",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Contact confirmation transaction failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
