import type { Pool, PoolClient } from "pg";
import { advanceCrmOpportunity, type CrmEvidenceRef, type CrmMutationActor, type CrmOpportunity } from "./crm-core";
import { createCrmOutboxEvent } from "./crm-outbox";

export type FirstContactAttemptAuthority = Extract<CrmEvidenceRef["authority"], "NORAUTO_SYSTEM" | "MANAGER" | "DEALERSHIP_SYSTEM">;

export type FirstContactAttemptResult = {
  status: "APPLIED" | "DEDUPLICATED";
  opportunityId: string;
  obligationType: "FIRST_CONTACT";
  stage: "CONTACT_PENDING";
  satisfactionEvidenceRef: string;
  authorityEffect: "FIRST_CONTACT_ATTEMPT_RECORDED_ONLY";
};

type LockedFirstContactRow = {
  obligation_id: string;
  obligation_type: "FIRST_CONTACT";
  due_at: Date;
  satisfied_at: Date | null;
  satisfaction_evidence_ref: string | null;
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

function requireWorkspaceId(workspaceId: string) {
  const normalized = workspaceId.trim();
  if (!normalized) throw new Error("Follow-up command requires an explicit workspace boundary.");
  if (normalized.length > 128) throw new Error("Follow-up workspace identifier exceeds supported length.");
  return normalized;
}

function requireOpportunityId(opportunityId: string) {
  const normalized = opportunityId.trim();
  if (!/^namo_[0-9a-f]{24}$/.test(normalized)) {
    throw new Error("Follow-up command requires a valid opportunity identifier.");
  }
  return normalized;
}

function requireEvidenceRef(evidenceRef: string) {
  const normalized = evidenceRef.trim();
  if (!normalized || normalized.length > 512) {
    throw new Error("First-contact satisfaction requires a bounded external evidence reference.");
  }
  return normalized;
}

function requireObservedAt(observedAt: string) {
  const parsed = new Date(observedAt);
  if (Number.isNaN(parsed.getTime())) throw new Error("First-contact evidence observation time is invalid.");
  return parsed.toISOString();
}

function actorForAuthority(authority: FirstContactAttemptAuthority): CrmMutationActor {
  return authority;
}

async function loadLockedFirstContact(client: PoolClient, workspaceId: string, opportunityId: string) {
  const result = await client.query<LockedFirstContactRow>(
    `SELECT
       f.obligation_id::text, f.obligation_type, f.due_at, f.satisfied_at, f.satisfaction_evidence_ref,
       o.opportunity_id, o.intake_idempotency_key, o.pipeline, o.stage, o.desk_state,
       o.customer, o.buying_intent, o.inventory_evidence, o.attribution,
       o.latest_handoff_id, o.latest_manager_receipt_id, o.outcome_type,
       o.outcome_evidence_ref, o.created_at, o.updated_at
     FROM crm_follow_up_obligations f
     JOIN crm_opportunities o
       ON o.workspace_id = f.workspace_id
      AND o.opportunity_id = f.opportunity_id
     WHERE f.workspace_id = $1
       AND f.opportunity_id = $2
       AND f.obligation_type = 'FIRST_CONTACT'
     ORDER BY f.due_at ASC
     LIMIT 1
     FOR UPDATE OF f, o`,
    [workspaceId, opportunityId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("First-contact obligation could not be resolved in the requested workspace.");
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

async function reconstructOpportunity(client: PoolClient, workspaceId: string, row: LockedFirstContactRow): Promise<CrmOpportunity> {
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

async function existingContactAttempt(client: PoolClient, workspaceId: string, opportunityId: string, evidenceRef: string) {
  const result = await client.query<{
    authority: CrmEvidenceRef["authority"];
    observed_at: Date;
  }>(
    `SELECT authority, observed_at
       FROM crm_evidence
      WHERE workspace_id = $1
        AND opportunity_id = $2
        AND kind = 'CONTACT_ATTEMPT'
        AND evidence_ref = $3`,
    [workspaceId, opportunityId, evidenceRef],
  );
  return result.rows[0];
}

export async function executeFirstContactAttemptCommand(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  evidenceRef: string;
  authority: FirstContactAttemptAuthority;
  observedAt: string;
}): Promise<FirstContactAttemptResult> {
  const workspaceId = requireWorkspaceId(input.workspaceId);
  const opportunityId = requireOpportunityId(input.opportunityId);
  const evidenceRef = requireEvidenceRef(input.evidenceRef);
  const observedAt = requireObservedAt(input.observedAt);
  const client = await input.pool.connect();

  try {
    await client.query("BEGIN");
    const row = await loadLockedFirstContact(client, workspaceId, opportunityId);

    if (row.satisfied_at || row.satisfaction_evidence_ref) {
      if (row.satisfaction_evidence_ref !== evidenceRef) {
        throw new Error("First-contact obligation is already satisfied by different evidence.");
      }
      if (row.stage !== "CONTACT_PENDING") {
        throw new Error("Satisfied first-contact obligation is not in the expected contact-pending stage.");
      }
      await client.query("COMMIT");
      return {
        status: "DEDUPLICATED",
        opportunityId,
        obligationType: "FIRST_CONTACT",
        stage: "CONTACT_PENDING",
        satisfactionEvidenceRef: evidenceRef,
        authorityEffect: "FIRST_CONTACT_ATTEMPT_RECORDED_ONLY",
      };
    }

    if (row.stage !== "NEW") {
      throw new Error("First-contact attempt may only satisfy an unsatisfied NEW opportunity obligation.");
    }

    const evidence: CrmEvidenceRef = {
      kind: "CONTACT_ATTEMPT",
      ref: evidenceRef,
      observedAt,
      authority: input.authority,
    };

    const priorEvidence = await existingContactAttempt(client, workspaceId, opportunityId, evidenceRef);
    if (priorEvidence) {
      if (priorEvidence.authority !== input.authority || priorEvidence.observed_at.toISOString() !== observedAt) {
        throw new Error("Contact-attempt evidence identity collision does not match the supplied evidence.");
      }
    } else {
      await client.query(
        `INSERT INTO crm_evidence (
           workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at, payload
         ) VALUES ($1, $2, 'CONTACT_ATTEMPT', $3, $4, $5::timestamptz, $6::jsonb)`,
        [
          workspaceId,
          opportunityId,
          evidenceRef,
          input.authority,
          observedAt,
          { obligationType: "FIRST_CONTACT", truthState: "OBSERVED_ATTEMPT" },
        ],
      );
    }

    const opportunity = await reconstructOpportunity(client, workspaceId, row);
    const updated = advanceCrmOpportunity({
      opportunity,
      to: "CONTACT_PENDING",
      actor: actorForAuthority(input.authority),
      evidence,
      observedAt,
    });

    const obligationUpdate = await client.query(
      `UPDATE crm_follow_up_obligations
          SET satisfied_at = $4::timestamptz,
              satisfaction_evidence_ref = $3
        WHERE workspace_id = $1
          AND opportunity_id = $2
          AND obligation_type = 'FIRST_CONTACT'
          AND satisfied_at IS NULL
          AND satisfaction_evidence_ref IS NULL`,
      [workspaceId, opportunityId, evidenceRef, observedAt],
    );
    if (obligationUpdate.rowCount !== 1) throw new Error("First-contact obligation lost its unsatisfied state before mutation.");

    const opportunityUpdate = await client.query(
      `UPDATE crm_opportunities
          SET stage = 'CONTACT_PENDING', updated_at = $3::timestamptz
        WHERE workspace_id = $1
          AND opportunity_id = $2
          AND stage = 'NEW'`,
      [workspaceId, opportunityId, observedAt],
    );
    if (opportunityUpdate.rowCount !== 1) throw new Error("First-contact opportunity lost its NEW state before mutation.");

    const outbox = createCrmOutboxEvent({
      opportunity: updated,
      eventType: "CRM_OPPORTUNITY_STAGE_CHANGED",
      occurredAt: observedAt,
      payload: {
        opportunityId,
        from: "NEW",
        to: "CONTACT_PENDING",
        reason: "FIRST_CONTACT_ATTEMPT_RECORDED",
        obligationType: "FIRST_CONTACT",
        satisfactionEvidenceRef: evidenceRef,
        authority: input.authority,
        authorityEffect: "FIRST_CONTACT_ATTEMPT_RECORDED_ONLY",
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
      obligationType: "FIRST_CONTACT",
      stage: "CONTACT_PENDING",
      satisfactionEvidenceRef: evidenceRef,
      authorityEffect: "FIRST_CONTACT_ATTEMPT_RECORDED_ONLY",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "First-contact attempt transaction failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
