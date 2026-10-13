import type { Pool } from "pg";
import type { VehicleHunt } from "./vehicle-hunt";
import type { IndustryScoutObservation } from "./industry-scout";
import type { ScoutOpportunityMatch } from "./scout-opportunity-matcher";

export async function persistVehicleHunt(input: {
  pool: Pool;
  hunt: VehicleHunt;
}) {
  const result = await input.pool.query(
    `INSERT INTO torque_vehicle_hunts (
      hunt_id, workspace_id, opportunity_id, user_id, origin, state,
      requirements, explicit_customer_text, match_dna_label, candidate_vins,
      preferred_contact_order, consent_to_contact, salesperson_owner, truth,
      created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb,$15::timestamptz,$16::timestamptz
    )
    ON CONFLICT (hunt_id) DO UPDATE SET
      state = EXCLUDED.state,
      requirements = EXCLUDED.requirements,
      match_dna_label = EXCLUDED.match_dna_label,
      candidate_vins = EXCLUDED.candidate_vins,
      preferred_contact_order = EXCLUDED.preferred_contact_order,
      consent_to_contact = EXCLUDED.consent_to_contact,
      salesperson_owner = EXCLUDED.salesperson_owner,
      truth = EXCLUDED.truth,
      updated_at = EXCLUDED.updated_at
    WHERE torque_vehicle_hunts.workspace_id = EXCLUDED.workspace_id
      AND torque_vehicle_hunts.created_at = EXCLUDED.created_at
    RETURNING hunt_id, state, updated_at`,
    [
      input.hunt.huntId,
      input.hunt.workspaceId,
      input.hunt.opportunityId ?? null,
      input.hunt.userId ?? null,
      input.hunt.origin,
      input.hunt.state,
      JSON.stringify(input.hunt.requirements),
      input.hunt.explicitCustomerText,
      input.hunt.matchDnaLabel ?? null,
      JSON.stringify(input.hunt.candidateVins),
      JSON.stringify(input.hunt.preferredContactOrder),
      input.hunt.consentToContact,
      input.hunt.salespersonOwner ?? null,
      JSON.stringify(input.hunt.truth),
      input.hunt.createdAt,
      input.hunt.updatedAt,
    ],
  );
  if (result.rowCount !== 1) throw new Error("Vehicle Hunt persistence collision or workspace mismatch.");
  return result.rows[0] as { hunt_id: string; state: string; updated_at: Date };
}

export async function persistIndustryScoutObservation(input: {
  pool: Pool;
  observation: IndustryScoutObservation;
}) {
  const o = input.observation;
  const result = await input.pool.query(
    `INSERT INTO industry_scout_observations (
      observation_id, topic, headline, summary, affected_makes, affected_models,
      market, effective_at, expires_at, observed_at, source_id, source_url,
      source_class, evidence_state, sales_impact, torque_use
    ) VALUES (
      $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::timestamptz,$9::timestamptz,$10::timestamptz,
      $11,$12,$13,$14,$15,$16
    )
    ON CONFLICT (observation_id) DO NOTHING
    RETURNING observation_id`,
    [
      o.observationId,o.topic,o.headline,o.summary,JSON.stringify(o.affectedMakes),
      JSON.stringify(o.affectedModels),o.market ?? null,o.effectiveAt ?? null,o.expiresAt ?? null,
      o.observedAt,o.sourceId,o.sourceUrl,o.sourceClass,o.evidenceState,o.salesImpact,o.torqueUse,
    ],
  );
  return { inserted: result.rowCount === 1 };
}

export async function persistScoutOpportunityMatch(input: {
  pool: Pool;
  match: ScoutOpportunityMatch;
}) {
  const m = input.match;
  await input.pool.query(
    `INSERT INTO scout_opportunity_matches (
      observation_id, hunt_id, score, reasons, action, customer_safe,
      requires_human_verification, created_at
    ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8::timestamptz)
    ON CONFLICT (observation_id, hunt_id) DO UPDATE SET
      score = EXCLUDED.score,
      reasons = EXCLUDED.reasons,
      action = EXCLUDED.action,
      customer_safe = EXCLUDED.customer_safe,
      requires_human_verification = EXCLUDED.requires_human_verification,
      created_at = EXCLUDED.created_at`,
    [
      m.observationId,m.huntId,m.score,JSON.stringify(m.reasons),m.action,
      m.customerSafe,m.requiresHumanVerification,m.createdAt,
    ],
  );
}

export type WatchtowerOpportunityQueueItem = {
  observationId: string;
  huntId: string;
  score: number;
  action: ScoutOpportunityMatch["action"];
  reasons: string[];
  headline: string;
  topic: IndustryScoutObservation["topic"];
  evidenceState: IndustryScoutObservation["evidenceState"];
  salesImpact: IndustryScoutObservation["salesImpact"];
  huntState: VehicleHunt["state"];
  salespersonOwner?: string;
  explicitCustomerText: string;
  updatedAt: string;
};

export async function readWatchtowerOpportunityQueue(input: {
  pool: Pool;
  workspaceId: string;
  limit?: number;
}): Promise<WatchtowerOpportunityQueueItem[]> {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("Watchtower queue requires explicit workspace identity.");
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));

  const result = await input.pool.query(
    `SELECT
      m.observation_id,
      m.hunt_id,
      m.score,
      m.action,
      m.reasons,
      o.headline,
      o.topic,
      o.evidence_state,
      o.sales_impact,
      h.state AS hunt_state,
      h.salesperson_owner,
      h.explicit_customer_text,
      h.updated_at
    FROM scout_opportunity_matches m
    JOIN industry_scout_observations o ON o.observation_id = m.observation_id
    JOIN torque_vehicle_hunts h ON h.hunt_id = m.hunt_id
    WHERE h.workspace_id = $1
      AND m.action <> 'NO_ACTION'
      AND h.state <> 'CLOSED'
    ORDER BY
      CASE m.action
        WHEN 'TEXT_CUSTOMER' THEN 1
        WHEN 'EMAIL_CUSTOMER' THEN 2
        WHEN 'MANAGER_REVIEW' THEN 3
        WHEN 'SALESPERSON_REVIEW' THEN 4
        ELSE 5
      END,
      m.score DESC,
      m.created_at DESC
    LIMIT $2`,
    [workspaceId, limit],
  );

  return result.rows.map((row) => ({
    observationId: row.observation_id,
    huntId: row.hunt_id,
    score: row.score,
    action: row.action,
    reasons: row.reasons ?? [],
    headline: row.headline,
    topic: row.topic,
    evidenceState: row.evidence_state,
    salesImpact: row.sales_impact,
    huntState: row.hunt_state,
    salespersonOwner: row.salesperson_owner ?? undefined,
    explicitCustomerText: row.explicit_customer_text,
    updatedAt: row.updated_at.toISOString(),
  }));
}
