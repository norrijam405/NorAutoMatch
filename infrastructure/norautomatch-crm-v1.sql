-- NorAutoMatch CRM Persistence v1
-- Domain source of truth remains the verified TypeScript CRM contracts.
-- This schema persists those facts and must not manufacture workflow authority.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS crm_opportunities (
    opportunity_id TEXT PRIMARY KEY CHECK (opportunity_id ~ '^namo_[0-9a-f]{24}$'),
    workspace_id TEXT NOT NULL,
    intake_idempotency_key CHAR(64) NOT NULL UNIQUE CHECK (intake_idempotency_key ~ '^[0-9a-f]{64}$'),
    pipeline TEXT NOT NULL CHECK (pipeline IN ('Standard Retail', 'Vehicle Sourcing')),
    stage TEXT NOT NULL CHECK (stage IN ('NEW', 'CONTACT_PENDING', 'CONTACTED', 'APPOINTMENT_SET', 'SOLD', 'LOST')),
    desk_state TEXT NOT NULL CHECK (desk_state IN ('NOT_PREPARED', 'MANAGER_REVIEW_PENDING', 'MANAGER_ACKNOWLEDGED', 'RETURNED_FOR_CLARIFICATION')),
    customer JSONB NOT NULL,
    buying_intent JSONB NOT NULL,
    inventory_evidence JSONB NOT NULL,
    attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
    latest_handoff_id TEXT NOT NULL CHECK (latest_handoff_id ~ '^namh_[0-9a-f]{24}$'),
    latest_manager_receipt_id TEXT,
    outcome_type TEXT CHECK (outcome_type IS NULL OR outcome_type IN ('SOLD', 'LOST')),
    outcome_evidence_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT crm_terminal_outcome_consistency CHECK (
        (stage NOT IN ('SOLD', 'LOST') AND outcome_type IS NULL AND outcome_evidence_ref IS NULL)
        OR
        (stage IN ('SOLD', 'LOST') AND outcome_type = stage AND outcome_evidence_ref IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_opportunity_workspace_id_unique
    ON crm_opportunities (workspace_id, opportunity_id);

CREATE INDEX IF NOT EXISTS crm_opportunity_pipeline_stage_idx
    ON crm_opportunities (workspace_id, pipeline, stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS crm_opportunity_follow_up_idx
    ON crm_opportunities (workspace_id, created_at)
    WHERE stage IN ('NEW', 'CONTACT_PENDING');

CREATE TABLE IF NOT EXISTS crm_evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN (
        'LEAD_SUBMISSION',
        'CONTACT_ATTEMPT',
        'CONTACT_CONFIRMED',
        'APPOINTMENT_CONFIRMED',
        'DEALERSHIP_SOLD_OUTCOME',
        'LOST_OUTCOME'
    )),
    evidence_ref TEXT NOT NULL,
    authority TEXT NOT NULL CHECK (authority IN ('CUSTOMER', 'NORAUTO_SYSTEM', 'MANAGER', 'DEALERSHIP_SYSTEM')),
    observed_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (workspace_id, opportunity_id, kind, evidence_ref),
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS crm_evidence_opportunity_idx
    ON crm_evidence (workspace_id, opportunity_id, observed_at);

CREATE TABLE IF NOT EXISTS crm_manager_review_receipts (
    receipt_id TEXT PRIMARY KEY CHECK (receipt_id ~ '^namr_[0-9a-f]{24}$'),
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    handoff_id TEXT NOT NULL CHECK (handoff_id ~ '^namh_[0-9a-f]{24}$'),
    receipt_idempotency_key CHAR(64) NOT NULL UNIQUE CHECK (receipt_idempotency_key ~ '^[0-9a-f]{64}$'),
    decision TEXT NOT NULL CHECK (decision IN ('ACKNOWLEDGED', 'RETURNED_FOR_CLARIFICATION')),
    actor_subject_id TEXT NOT NULL,
    actor_verifier TEXT NOT NULL,
    actor_evidence_ref TEXT,
    truth_state TEXT NOT NULL CHECK (truth_state = 'VERIFIED_MANAGER_ACTION'),
    recorded_at TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS crm_outbox (
    event_id TEXT PRIMARY KEY CHECK (event_id ~ '^name_[0-9a-f]{24}$'),
    workspace_id TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_idempotency_key CHAR(64) NOT NULL UNIQUE CHECK (event_idempotency_key ~ '^[0-9a-f]{64}$'),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'CRM_OPPORTUNITY_CREATED',
        'CRM_OPPORTUNITY_STAGE_CHANGED',
        'CRM_MANAGER_REVIEW_APPLIED',
        'CRM_FOLLOW_UP_DUE',
        'CRM_OUTCOME_RECORDED'
    )),
    pipeline TEXT NOT NULL CHECK (pipeline IN ('Standard Retail', 'Vehicle Sourcing')),
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    delivery_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (delivery_state IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts > 0),
    last_error TEXT,
    next_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id, aggregate_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT,
    CONSTRAINT crm_outbox_delivery_consistency CHECK (
        (delivery_state = 'DELIVERED' AND delivered_at IS NOT NULL)
        OR
        (delivery_state <> 'DELIVERED' AND delivered_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS crm_outbox_pending_idx
    ON crm_outbox (delivery_state, next_attempt_at, created_at)
    WHERE delivery_state IN ('PENDING', 'FAILED');

CREATE TABLE IF NOT EXISTS crm_follow_up_obligations (
    obligation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    obligation_type TEXT NOT NULL CHECK (obligation_type IN ('FIRST_CONTACT', 'FOLLOW_UP')),
    due_at TIMESTAMPTZ NOT NULL,
    satisfied_at TIMESTAMPTZ,
    satisfaction_evidence_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, opportunity_id, obligation_type, due_at),
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT,
    CONSTRAINT crm_follow_up_satisfaction_consistency CHECK (
        (satisfied_at IS NULL AND satisfaction_evidence_ref IS NULL)
        OR
        (satisfied_at IS NOT NULL AND satisfaction_evidence_ref IS NOT NULL)
    )
);

-- Evidence and manager receipts are append-only historical facts.
CREATE OR REPLACE FUNCTION norautomatch_reject_immutable_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'NorAutoMatch immutable evidence/receipt rows cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_evidence_immutable_update ON crm_evidence;
CREATE TRIGGER crm_evidence_immutable_update
BEFORE UPDATE OR DELETE ON crm_evidence
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_immutable_mutation();

DROP TRIGGER IF EXISTS crm_manager_receipt_immutable_update ON crm_manager_review_receipts;
CREATE TRIGGER crm_manager_receipt_immutable_update
BEFORE UPDATE OR DELETE ON crm_manager_review_receipts
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_immutable_mutation();

CREATE OR REPLACE FUNCTION norautomatch_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_opportunities_touch_updated_at ON crm_opportunities;
CREATE TRIGGER crm_opportunities_touch_updated_at
BEFORE UPDATE ON crm_opportunities
FOR EACH ROW EXECUTE FUNCTION norautomatch_touch_updated_at();

DROP TRIGGER IF EXISTS crm_outbox_touch_updated_at ON crm_outbox;
CREATE TRIGGER crm_outbox_touch_updated_at
BEFORE UPDATE ON crm_outbox
FOR EACH ROW EXECUTE FUNCTION norautomatch_touch_updated_at();

COMMENT ON TABLE crm_opportunities IS 'NorAutoMatch CRM opportunity snapshots. State changes remain evidence-bound by application domain contracts.';
COMMENT ON TABLE crm_evidence IS 'Append-only evidence supporting CRM truth states and outcomes.';
COMMENT ON TABLE crm_outbox IS 'Durable transactional outbox. Opportunity mutation and corresponding outbox events must commit in one DB transaction.';
