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
      AND (
        m.action NOT IN ('TEXT_CUSTOMER', 'EMAIL_CUSTOMER')
        OR (
          h.consent_to_contact = TRUE
          AND m.customer_safe = TRUE
          AND m.requires_human_verification = FALSE
          AND o.torque_use = 'CUSTOMER_SAFE'
          AND o.evidence_state IN ('PRIMARY_VERIFIED', 'CORROBORATED')
        )
      )
      AND h.state NOT IN ('CLOSED', 'PAUSED')
      AND o.observed_at <= NOW()
      AND (o.effective_at IS NULL OR o.effective_at <= NOW())
      AND (o.expires_at IS NULL OR o.expires_at > NOW())
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


export type ActiveVehicleHuntListItem = {
  huntId: string;
  origin: VehicleHunt["origin"];
  state: VehicleHunt["state"];
  explicitCustomerText: string;
  requirements: VehicleHunt["requirements"];
  matchDnaLabel?: string;
  candidateCount: number;
  candidateVins: VehicleHunt["candidateVins"];
  truth: VehicleHunt["truth"];
  consentToContact: boolean;
  salespersonOwner?: string;
  createdAt: string;
  updatedAt: string;
};

export async function readActiveVehicleHunts(input: {
  pool: Pool;
  workspaceId: string;
  limit?: number;
}): Promise<ActiveVehicleHuntListItem[]> {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("Vehicle Hunt queue requires explicit workspace identity.");
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));

  const result = await input.pool.query(
    `SELECT
      hunt_id,
      origin,
      state,
      explicit_customer_text,
      requirements,
      match_dna_label,
      candidate_vins,
      truth,
      consent_to_contact,
      salesperson_owner,
      created_at,
      updated_at
    FROM torque_vehicle_hunts
    WHERE workspace_id = $1
      AND state <> 'CLOSED'
    ORDER BY
      CASE state
        WHEN 'LOCAL_MATCH_FOUND' THEN 1
        WHEN 'NETWORK_MATCH_FOUND' THEN 2
        WHEN 'OUT_OF_NETWORK_MATCH_FOUND' THEN 3
        WHEN 'AWAITING_HUMAN_VERIFICATION' THEN 4
        WHEN 'SEARCHING' THEN 5
        WHEN 'CUSTOMER_REVIEW' THEN 6
        WHEN 'PAUSED' THEN 7
        ELSE 8
      END,
      updated_at DESC
    LIMIT $2`,
    [workspaceId, limit],
  );

  return result.rows.map((row) => ({
    huntId: row.hunt_id,
    origin: row.origin,
    state: row.state,
    explicitCustomerText: row.explicit_customer_text,
    requirements: row.requirements,
    matchDnaLabel: row.match_dna_label ?? undefined,
    candidateCount: Array.isArray(row.candidate_vins) ? row.candidate_vins.length : 0,
    candidateVins: Array.isArray(row.candidate_vins) ? row.candidate_vins : [],
    truth: row.truth,
    consentToContact: row.consent_to_contact,
    salespersonOwner: row.salesperson_owner ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}


export async function readVehicleHunt(input: {
  pool: Pool;
  workspaceId: string;
  huntId: string;
}): Promise<VehicleHunt | null> {
  const workspaceId = input.workspaceId.trim();
  const huntId = input.huntId.trim();
  if (!workspaceId) throw new Error("Vehicle Hunt read requires explicit workspace identity.");
  if (!/^namvh_[0-9a-f]{24}$/.test(huntId)) throw new Error("Vehicle Hunt read requires a valid hunt identifier.");

  const result = await input.pool.query(
    `SELECT
      hunt_id, workspace_id, opportunity_id, user_id, origin, state,
      requirements, explicit_customer_text, match_dna_label, candidate_vins,
      preferred_contact_order, consent_to_contact, salesperson_owner, truth,
      created_at, updated_at
    FROM torque_vehicle_hunts
    WHERE workspace_id = $1 AND hunt_id = $2
    LIMIT 1`,
    [workspaceId, huntId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    protocol: "NORAUTO_VEHICLE_HUNT_V1",
    huntId: row.hunt_id,
    workspaceId: row.workspace_id,
    opportunityId: row.opportunity_id ?? undefined,
    userId: row.user_id ?? undefined,
    origin: row.origin,
    state: row.state,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    requirements: row.requirements,
    explicitCustomerText: row.explicit_customer_text,
    matchDnaLabel: row.match_dna_label ?? undefined,
    candidateVins: Array.isArray(row.candidate_vins) ? row.candidate_vins : [],
    preferredContactOrder: Array.isArray(row.preferred_contact_order) ? row.preferred_contact_order : ["TEXT","EMAIL"],
    consentToContact: row.consent_to_contact,
    salespersonOwner: row.salesperson_owner ?? undefined,
    truth: row.truth,
  };
}


export type VehicleHuntCustomerContext = {
  huntId: string;
  opportunityId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: true;
  stage: string;
};

export async function readVehicleHuntCustomerContext(input: {
  pool: Pool;
  workspaceId: string;
  huntId: string;
}): Promise<VehicleHuntCustomerContext | null> {
  const workspaceId = input.workspaceId.trim();
  const huntId = input.huntId.trim();
  if (!workspaceId) throw new Error("Vehicle Hunt customer context requires explicit workspace identity.");
  if (!/^namvh_[0-9a-f]{24}$/.test(huntId)) throw new Error("Vehicle Hunt customer context requires a valid hunt identifier.");

  const result = await input.pool.query(
    `SELECT
      h.hunt_id,
      o.opportunity_id,
      o.customer,
      o.stage
    FROM torque_vehicle_hunts h
    JOIN crm_opportunities o
      ON o.workspace_id = h.workspace_id
     AND o.opportunity_id = h.opportunity_id
    WHERE h.workspace_id = $1
      AND h.hunt_id = $2
      AND h.opportunity_id IS NOT NULL
      AND o.stage NOT IN ('SOLD','LOST')
    LIMIT 1`,
    [workspaceId, huntId],
  );

  const row = result.rows[0];
  if (!row) return null;
  const customer = row.customer;
  if (
    !customer ||
    typeof customer.firstName !== "string" ||
    typeof customer.lastName !== "string" ||
    typeof customer.email !== "string" ||
    typeof customer.phone !== "string" ||
    customer.consent !== true
  ) {
    throw new Error("Vehicle Hunt CRM customer context is malformed.");
  }

  return {
    huntId: row.hunt_id,
    opportunityId: row.opportunity_id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    consent: true,
    stage: row.stage,
  };
}


export async function attachVehicleHuntToOpportunity(input: {
  pool: Pool;
  workspaceId: string;
  huntId: string;
  opportunityId: string;
}) {
  const workspaceId = input.workspaceId.trim();
  const huntId = input.huntId.trim();
  const opportunityId = input.opportunityId.trim();

  if (!workspaceId) throw new Error("Vehicle Hunt attach requires explicit workspace identity.");
  if (!/^namvh_[0-9a-f]{24}$/.test(huntId)) throw new Error("Vehicle Hunt attach requires a valid hunt identifier.");
  if (!/^namo_[0-9a-f]{24}$/.test(opportunityId)) throw new Error("Vehicle Hunt attach requires a valid opportunity identifier.");

  const result = await input.pool.query(
    `UPDATE torque_vehicle_hunts h
        SET opportunity_id = $3,
            updated_at = GREATEST(h.updated_at, NOW())
      WHERE h.workspace_id = $1
        AND h.hunt_id = $2
        AND (h.opportunity_id IS NULL OR h.opportunity_id = $3)
        AND EXISTS (
          SELECT 1
            FROM crm_opportunities o
           WHERE o.workspace_id = $1
             AND o.opportunity_id = $3
        )
      RETURNING h.hunt_id, h.opportunity_id`,
    [workspaceId, huntId, opportunityId],
  );

  if (result.rowCount !== 1) {
    throw new Error("Vehicle Hunt could not be linked to the requested CRM opportunity.");
  }

  return {
    huntId: result.rows[0].hunt_id as string,
    opportunityId: result.rows[0].opportunity_id as string,
  };
}
