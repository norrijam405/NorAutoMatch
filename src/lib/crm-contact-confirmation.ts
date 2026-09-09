import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { ManagerActorEvidence } from "./manager-review-receipt";

export type ConfirmCustomerContactResult =
  | {
      status: "APPLIED";
      opportunityId: string;
      stage: "CONTACTED";
      satisfactionEvidenceRef: string;
      outboxEventIds: string[];
      authorityEffect: "CONTACT_STATE_ONLY";
    }
  | {
      status: "DEDUPLICATED";
      opportunityId: string;
      stage: "CONTACTED";
      satisfactionEvidenceRef: string;
      authorityEffect: "NONE";
    };

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function requireText(value: string, label: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${label} is invalid.`);
  return normalized;
}

function stageEvent(input: {
  opportunityId: string;
  pipeline: "Standard Retail" | "Vehicle Sourcing";
  fromStage: "NEW" | "CONTACT_PENDING";
  toStage: "CONTACT_PENDING" | "CONTACTED";
  contactEvidenceRef?: string;
}) {
  const payload = {
    opportunityId: input.opportunityId,
    fromStage: input.fromStage,
    toStage: input.toStage,
    ...(input.contactEvidenceRef ? { contactEvidenceRef: input.contactEvidenceRef } : {}),
  };
  const identity = stableHash({
    protocol: "NORAUTO_CRM_OUTBOX_V1",
    eventType: "CRM_OPPORTUNITY_STAGE_CHANGED",
    aggregateId: input.opportunityId,
    pipeline: input.pipeline,
    payload,
  });
  return { eventId: `name_${identity.slice(0, 24)}`, identity, payload };
}

export async function confirmCustomerContact(input: {
  pool: Pool;
  workspaceId: string;
  opportunityId: string;
  contactEvidenceRef: string;
  actor: ManagerActorEvidence;
  observedAt?: string;
}): Promise<ConfirmCustomerContactResult> {
  if (input.actor.state !== "VERIFIED") {
    throw new Error("Confirmed customer contact requires a verified manager actor.");
  }

  const workspaceId = requireText(input.workspaceId, "Workspace", 128);
  const opportunityId = requireText(input.opportunityId, "Opportunity id", 128);
  const evidenceRef = requireText(input.contactEvidenceRef, "Contact evidence reference", 512);
  const observedAt = input.observedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(observedAt))) throw new Error("Contact observation time is invalid.");

  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");

    const opportunityResult = await client.query<{
      opportunity_id: string;
      pipeline: "Standard Retail" | "Vehicle Sourcing";
      stage: "NEW" | "CONTACT_PENDING" | "CONTACTED" | "APPOINTMENT_SET" | "SOLD" | "LOST";
    }>(
      `SELECT opportunity_id, pipeline, stage
         FROM crm_opportunities
        WHERE workspace_id = $1 AND opportunity_id = $2
        FOR UPDATE`,
      [workspaceId, opportunityId],
    );

    const opportunity = opportunityResult.rows[0];
    if (!opportunity) throw new Error("CRM opportunity was not found in the requested workspace.");

    const priorEvidence = await client.query<{ evidence_ref: string }>(
      `SELECT evidence_ref
         FROM crm_evidence
        WHERE workspace_id = $1
          AND opportunity_id = $2
          AND kind = 'CONTACT_CONFIRMED'
        ORDER BY observed_at ASC, evidence_id ASC`,
      [workspaceId, opportunityId],
    );

    const obligationResult = await client.query<{
      obligation_id: string;
      satisfied_at: Date | null;
      satisfaction_evidence_ref: string | null;
    }>(
      `SELECT obligation_id, satisfied_at, satisfaction_evidence_ref
         FROM crm_follow_up_obligations
        WHERE workspace_id = $1
          AND opportunity_id = $2
          AND obligation_type = 'FIRST_CONTACT'
        ORDER BY due_at ASC
        LIMIT 1
        FOR UPDATE`,
      [workspaceId, opportunityId],
    );

    const obligation = obligationResult.rows[0];
    if (!obligation) throw new Error("First-contact obligation is missing; contact confirmation failed closed.");

    if (opportunity.stage === "CONTACTED" || opportunity.stage === "APPOINTMENT_SET" || opportunity.stage === "SOLD") {
      const sameEvidence = priorEvidence.some((row) => row.evidence_ref === evidenceRef);
      if (sameEvidence && obligation.satisfaction_evidence_ref === evidenceRef && obligation.satisfied_at) {
        await client.query("COMMIT");
        return {
          status: "DEDUPLICATED",
          opportunityId,
          stage: "CONTACTED",
          satisfactionEvidenceRef: evidenceRef,
          authorityEffect: "NONE",
        };
      }
      throw new Error("Contact is already recorded with different evidence or later CRM state.");
    }

    if (opportunity.stage === "LOST") throw new Error("Lost opportunities cannot be marked contacted.");
    if (opportunity.stage !== "NEW" && opportunity.stage !== "CONTACT_PENDING") {
      throw new Error("Opportunity is not eligible for contact confirmation.");
    }
    if (obligation.satisfied_at || obligation.satisfaction_evidence_ref) {
      throw new Error("First-contact obligation is already satisfied with different evidence.");
    }
    if (priorEvidence.length > 0) {
      throw new Error("Conflicting CONTACT_CONFIRMED evidence already exists.");
    }

    const outboxEvents: Array<ReturnType<typeof stageEvent>> = [];
    if (opportunity.stage === "NEW") {
      outboxEvents.push(stageEvent({
        opportunityId,
        pipeline: opportunity.pipeline,
        fromStage: "NEW",
        toStage: "CONTACT_PENDING",
      }));
    }
    outboxEvents.push(stageEvent({
      opportunityId,
      pipeline: opportunity.pipeline,
      fromStage: "CONTACT_PENDING",
      toStage: "CONTACTED",
      contactEvidenceRef: evidenceRef,
    }));

    await client.query(
      `INSERT INTO crm_evidence (
         workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at, payload
       ) VALUES ($1, $2, 'CONTACT_CONFIRMED', $3, 'MANAGER', $4::timestamptz, $5::jsonb)`,
      [
        workspaceId,
        opportunityId,
        evidenceRef,
        observedAt,
        {
          verifier: input.actor.verifier,
          actorSubjectId: input.actor.subjectId,
          actorEvidenceRef: input.actor.evidenceRef ?? null,
          actorVerifiedAt: input.actor.verifiedAt,
        },
      ],
    );

    await client.query(
      `UPDATE crm_opportunities
          SET stage = 'CONTACTED', updated_at = $3::timestamptz
        WHERE workspace_id = $1 AND opportunity_id = $2`,
      [workspaceId, opportunityId, observedAt],
    );

    const satisfaction = await client.query(
      `UPDATE crm_follow_up_obligations
          SET satisfied_at = $3::timestamptz,
              satisfaction_evidence_ref = $4
        WHERE workspace_id = $1
          AND opportunity_id = $2
          AND obligation_type = 'FIRST_CONTACT'
          AND satisfied_at IS NULL
          AND satisfaction_evidence_ref IS NULL`,
      [workspaceId, opportunityId, observedAt, evidenceRef],
    );
    if (satisfaction.rowCount !== 1) throw new Error("First-contact satisfaction was not recorded exactly once.");

    for (const event of outboxEvents) {
      await client.query(
        `INSERT INTO crm_outbox (
           event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
           pipeline, payload, occurred_at, delivery_state, attempts, max_attempts
         ) VALUES ($1, $2, $3, $4, 'CRM_OPPORTUNITY_STAGE_CHANGED', $5, $6::jsonb,
                   $7::timestamptz, 'PENDING', 0, 8)`,
        [event.eventId, workspaceId, opportunityId, event.identity, opportunity.pipeline, event.payload, observedAt],
      );
    }

    await client.query("COMMIT");
    return {
      status: "APPLIED",
      opportunityId,
      stage: "CONTACTED",
      satisfactionEvidenceRef: evidenceRef,
      outboxEventIds: outboxEvents.map((event) => event.eventId),
      authorityEffect: "CONTACT_STATE_ONLY",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "Contact confirmation failed and rollback also failed.");
    }
    throw error;
  } finally {
    client.release();
  }
}
