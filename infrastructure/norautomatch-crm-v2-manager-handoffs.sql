-- NorAutoMatch CRM Persistence v2 — Manager Handoffs
-- Persists the exact manager-review packet behind latest_handoff_id.
-- Handoffs are immutable historical facts and do not grant deal authority.
-- Application persistence validates handoff/opportunity identity before commit;
-- the handoff row itself is FK-bound to its owning opportunity.

CREATE TABLE IF NOT EXISTS crm_manager_handoffs (
    handoff_id TEXT PRIMARY KEY CHECK (handoff_id ~ '^namh_[0-9a-f]{24}$'),
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    handoff_idempotency_key CHAR(64) NOT NULL UNIQUE CHECK (handoff_idempotency_key ~ '^[0-9a-f]{64}$'),
    protocol TEXT NOT NULL CHECK (protocol = 'NORAUTO_MANAGER_HANDOFF_V1'),
    workflow_state TEXT NOT NULL CHECK (workflow_state = 'MANAGER_REVIEW_PENDING'),
    desk_prep JSONB NOT NULL,
    authority JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, opportunity_id, handoff_id),
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS crm_manager_handoffs_pending_idx
    ON crm_manager_handoffs (workspace_id, created_at)
    WHERE workflow_state = 'MANAGER_REVIEW_PENDING';

DROP TRIGGER IF EXISTS crm_manager_handoff_immutable_update ON crm_manager_handoffs;
CREATE TRIGGER crm_manager_handoff_immutable_update
BEFORE UPDATE OR DELETE ON crm_manager_handoffs
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_immutable_mutation();

COMMENT ON TABLE crm_manager_handoffs IS 'Append-only exact manager-review handoff packets. Persistence does not grant approval, pricing, finance, or trade authority.';
