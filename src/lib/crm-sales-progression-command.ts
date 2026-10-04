import type { Pool, PoolClient } from "pg";
import { advanceCrmOpportunity, type CrmEvidenceRef, type CrmOpportunity } from "./crm-core";
import { createCrmOutboxEvent } from "./crm-outbox";

export type SalesProgressionAuthority = Extract<CrmEvidenceRef["authority"], "MANAGER" | "DEALERSHIP_SYSTEM">;

export type SalesProgressionResult = {
  status: "APPLIED" | "DEDUPLICATED";
  opportunityId: string;
  stage: CrmOpportunity["stage"];
  evidenceRef: string;
  attribution: CrmOpportunity["attribution"];
  authorityEffect: "APPOINTMENT_RECORDED_ONLY" | "OUTCOME_RECORDED_ONLY";
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
  if (!normalized || normalized.length > 128) throw new Error("Sales progression requires a valid workspace boundary.");
  return normalized;
}

function requireOpportunityId(value: string) {
  const normalized = value.trim();
  if (!/^namo_[0-9a-f]{24}$/.test(normalized)) throw new Error("Sales progression requires a valid opportunity identifier.");
  return normalized;
}

function requireEvidenceRef(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 512) throw new Error("Sales progression requires a bounded evidence reference.");
  return normalized;
}

function requireObservedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Sales progression observation time is invalid.");
  return parsed.toISOString();
}

async function lockOpportunity(client: PoolClient, workspaceId: string, opportunityId: string) {
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
  if (!row) throw new Error("Sales progression could not resolve the requested workspace opportunity.");
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

async function exactEvidence(client: PoolClient, workspaceId: string, opportunityId: string, kind: CrmEvidenceRef["kind"], evidenceRef: string) {
  const result = await client.query<{ authority: CrmEvidenceRef["authority"]; observed_at: Date }>(
    `SELECT authority, observed_at FROM crm_evidence
      WHERE workspace_id = $1 AND opportunity_id = $2 AND kind = $3 AND evidence_ref = $4`,
    [workspaceId, opportunityId, kind, evidenceRef],
  );
  return result.rows[0];
}

async function appendEvidence(client: PoolClient, input: {
  workspaceId: string;
  opportunityId: string;
  evidence: CrmEvidenceRef;
  payload: Record<string, unknown>;
}) {
  await client.query(
    `INSERT INTO crm_evidence (workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at, payload)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)`,
    [input.workspaceId, input.opportunityId, input.evidence.kind, input.evidence.ref,
      input.evidence.authority, input.evidence.observedAt, input.payload],
  );
}

async function appendOutbox(client: PoolClient, input: {
  workspaceId: string;
  opportunity: CrmOpportunity;
  eventType: "CRM_OPPORTUNITY_STAGE_CHANGED" | "CRM_OUTCOME_RECORDED";
  occurredAt: string;
  payload: Record<string, unknown>;
}) {
  const outbox = createCrmOutboxEvent({
    opportunity: input.opportunity,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    payload: input.payload,
  });
  await client.query(
    `INSERT INTO crm_outbox (
       event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
       pipeline, payload, occurred_at, delivery_state, attempts, max_attempts
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::timestamptz,$9,$10,$11)`,
    [outbox.eventId, input.workspaceId, outbox.aggregateId, outbox.idempotencyKey,
      outbox.eventType, outbox.pipeline, outbox.payload, outbox.occurredAt,
      outbox.delivery.state, outbox.delivery.attempts, outbox.delivery.maxAttempts],
  );
}

export async function executeAppointmentConfirmationCommand(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  evidenceRef: string;
  authority: SalesProgressionAuthority;
  observedAt: string;
}): Promise<SalesProgressionResult> {
  const workspaceId = requireWorkspaceId(input.workspaceId);
  const opportunityId = requireOpportunityId(input.opportunityId);
  const evidenceRef = requireEvidenceRef(input.evidenceRef);
  const observedAt = requireObservedAt(input.observedAt);
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const row = await lockOpportunity(client, workspaceId, opportunityId);
    const existing = await exactEvidence(client, workspaceId, opportunityId, "APPOINTMENT_CONFIRMED", evidenceRef);
    if (existing) {
      if (existing.authority !== input.authority || existing.observed_at.toISOString() !== observedAt) {
        throw new Error("Appointment evidence identity collision does not match supplied evidence.");
      }
      if (row.stage === "CONTACTED") throw new Error("Appointment evidence exists without durable stage advancement.");
      if (row.stage === "NEW" || row.stage === "CONTACT_PENDING") throw new Error("Appointment evidence cannot precede confirmed contact.");
      await client.query("COMMIT");
      return { status: "DEDUPLICATED", opportunityId, stage: row.stage, evidenceRef, attribution: row.attribution, authorityEffect: "APPOINTMENT_RECORDED_ONLY" };
    }
    if (row.stage !== "CONTACTED") throw new Error("Appointment confirmation requires a CONTACTED opportunity.");

    const evidence: CrmEvidenceRef = { kind: "APPOINTMENT_CONFIRMED", ref: evidenceRef, authority: input.authority, observedAt };
    const opportunity = await reconstructOpportunity(client, workspaceId, row);
    const updated = advanceCrmOpportunity({ opportunity, to: "APPOINTMENT_SET", actor: input.authority, evidence, observedAt });
    await appendEvidence(client, { workspaceId, opportunityId, evidence, payload: { truthState: "CONFIRMED_APPOINTMENT" } });
    const update = await client.query(
      `UPDATE crm_opportunities SET stage='APPOINTMENT_SET', updated_at=$3::timestamptz
        WHERE workspace_id=$1 AND opportunity_id=$2 AND stage='CONTACTED'`,
      [workspaceId, opportunityId, observedAt],
    );
    if (update.rowCount !== 1) throw new Error("Appointment transition lost CONTACTED state before mutation.");
    await appendOutbox(client, {
      workspaceId,
      opportunity: updated,
      eventType: "CRM_OPPORTUNITY_STAGE_CHANGED",
      occurredAt: observedAt,
      payload: { opportunityId, from: "CONTACTED", to: "APPOINTMENT_SET", evidenceRef, authority: input.authority, attribution: row.attribution, authorityEffect: "APPOINTMENT_RECORDED_ONLY" },
    });
    await client.query("COMMIT");
    return { status: "APPLIED", opportunityId, stage: "APPOINTMENT_SET", evidenceRef, attribution: row.attribution, authorityEffect: "APPOINTMENT_RECORDED_ONLY" };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { throw new AggregateError([error, rollbackError], "Appointment transaction and rollback failed."); }
    throw error;
  } finally { client.release(); }
}

export async function executeOutcomeCommand(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  outcome: "SOLD" | "LOST";
  evidenceRef: string;
  authority: SalesProgressionAuthority;
  observedAt: string;
}): Promise<SalesProgressionResult> {
  const workspaceId = requireWorkspaceId(input.workspaceId);
  const opportunityId = requireOpportunityId(input.opportunityId);
  const evidenceRef = requireEvidenceRef(input.evidenceRef);
  const observedAt = requireObservedAt(input.observedAt);
  const kind: CrmEvidenceRef["kind"] = input.outcome === "SOLD" ? "DEALERSHIP_SOLD_OUTCOME" : "LOST_OUTCOME";
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    const row = await lockOpportunity(client, workspaceId, opportunityId);
    const existing = await exactEvidence(client, workspaceId, opportunityId, kind, evidenceRef);
    if (existing) {
      if (existing.authority !== input.authority || existing.observed_at.toISOString() !== observedAt) {
        throw new Error("Outcome evidence identity collision does not match supplied evidence.");
      }
      if (row.stage !== input.outcome || row.outcome_type !== input.outcome || row.outcome_evidence_ref !== evidenceRef) {
        throw new Error("Outcome evidence exists without matching durable terminal state.");
      }
      await client.query("COMMIT");
      return { status: "DEDUPLICATED", opportunityId, stage: row.stage, evidenceRef, attribution: row.attribution, authorityEffect: "OUTCOME_RECORDED_ONLY" };
    }

    if (input.outcome === "SOLD" && row.stage !== "APPOINTMENT_SET") throw new Error("SOLD outcome requires APPOINTMENT_SET state.");
    if (input.outcome === "LOST" && !["CONTACT_PENDING", "CONTACTED", "APPOINTMENT_SET"].includes(row.stage)) {
      throw new Error("LOST outcome requires a non-terminal contacted workflow state.");
    }

    const evidence: CrmEvidenceRef = { kind, ref: evidenceRef, authority: input.authority, observedAt };
    const opportunity = await reconstructOpportunity(client, workspaceId, row);
    const updated = advanceCrmOpportunity({ opportunity, to: input.outcome, actor: input.authority, evidence, observedAt });
    await appendEvidence(client, { workspaceId, opportunityId, evidence, payload: { truthState: input.outcome === "SOLD" ? "DEALERSHIP_SOLD_CONFIRMED" : "LOST_CONFIRMED", attribution: row.attribution } });
    const update = await client.query(
      `UPDATE crm_opportunities
          SET stage=$3, outcome_type=$3, outcome_evidence_ref=$4, updated_at=$5::timestamptz
        WHERE workspace_id=$1 AND opportunity_id=$2 AND stage=$6`,
      [workspaceId, opportunityId, input.outcome, evidenceRef, observedAt, row.stage],
    );
    if (update.rowCount !== 1) throw new Error("Outcome transition lost its expected source state before mutation.");
    await appendOutbox(client, {
      workspaceId,
      opportunity: updated,
      eventType: "CRM_OUTCOME_RECORDED",
      occurredAt: observedAt,
      payload: { opportunityId, from: row.stage, to: input.outcome, outcome: input.outcome, evidenceRef, authority: input.authority, attribution: row.attribution, authorityEffect: "OUTCOME_RECORDED_ONLY" },
    });
    await client.query("COMMIT");
    return { status: "APPLIED", opportunityId, stage: input.outcome, evidenceRef, attribution: row.attribution, authorityEffect: "OUTCOME_RECORDED_ONLY" };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rollbackError) { throw new AggregateError([error, rollbackError], "Outcome transaction and rollback failed."); }
    throw error;
  } finally { client.release(); }
}
