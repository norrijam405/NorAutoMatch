-- NorAutoMatch CRM Persistence v7 — customer PII lifecycle / redaction overlay
-- Primary-record redaction is evidence-bound and must never be represented as backup or external-copy deletion.

CREATE TABLE IF NOT EXISTS crm_data_lifecycle (
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN (
        'ACTIVE',
        'REDACTION_REQUESTED',
        'LEGAL_HOLD',
        'PRIMARY_REDACTED_BACKUP_PENDING',
        'PRIMARY_REDACTED_BACKUP_EXPIRED'
    )),
    request_ref TEXT,
    request_authority TEXT,
    requested_at TIMESTAMPTZ,
    legal_hold_ref TEXT,
    legal_hold_authority TEXT,
    legal_hold_observed_at TIMESTAMPTZ,
    primary_redacted_at TIMESTAMPTZ,
    backup_disposition TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (backup_disposition IN (
        'NOT_APPLICABLE', 'PENDING_EXPIRY', 'EXPIRED_OR_PURGED', 'UNKNOWN'
    )),
    backup_disposition_ref TEXT,
    external_copies TEXT NOT NULL DEFAULT 'NOT_KNOWN' CHECK (external_copies IN (
        'NOT_KNOWN', 'MAY_EXIST', 'SEPARATELY_CONFIRMED_REMOVED'
    )),
    local_conversation_disposition TEXT NOT NULL DEFAULT 'NOT_EVALUATED' CHECK (local_conversation_disposition IN (
        'NOT_EVALUATED',
        'NO_EXPLICIT_TARGETS_DECLARED',
        'EXPLICIT_TARGETS_REDACTED_SCOPE_NOT_PROVEN_COMPLETE'
    )),
    authority_effect TEXT NOT NULL DEFAULT 'NONE' CHECK (authority_effect = 'NONE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, opportunity_id),
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT,
    CONSTRAINT crm_data_lifecycle_request_evidence CHECK (
        state <> 'REDACTION_REQUESTED'
        OR (request_ref IS NOT NULL AND request_authority IS NOT NULL AND requested_at IS NOT NULL)
    ),
    CONSTRAINT crm_data_lifecycle_hold_evidence CHECK (
        state <> 'LEGAL_HOLD'
        OR (legal_hold_ref IS NOT NULL AND legal_hold_authority IS NOT NULL AND legal_hold_observed_at IS NOT NULL)
    ),
    CONSTRAINT crm_data_lifecycle_redaction_evidence CHECK (
        state NOT IN ('PRIMARY_REDACTED_BACKUP_PENDING', 'PRIMARY_REDACTED_BACKUP_EXPIRED')
        OR primary_redacted_at IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS crm_data_lifecycle_conversation_targets (
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    target_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, opportunity_id, provider, event_id),
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_data_lifecycle (workspace_id, opportunity_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (workspace_id, provider, event_id)
        REFERENCES crm_conversation_events (workspace_id, provider, event_id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS crm_data_lifecycle_redaction_receipts (
    receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    request_ref TEXT NOT NULL,
    primary_redacted_at TIMESTAMPTZ NOT NULL,
    conversation_targets_redacted INTEGER NOT NULL CHECK (conversation_targets_redacted >= 0),
    backup_disposition TEXT NOT NULL CHECK (backup_disposition IN ('PENDING_EXPIRY', 'UNKNOWN')),
    external_copy_truth TEXT NOT NULL CHECK (external_copy_truth IN ('NOT_KNOWN', 'MAY_EXIST', 'SEPARATELY_CONFIRMED_REMOVED')),
    authority_effect TEXT NOT NULL DEFAULT 'NONE' CHECK (authority_effect = 'NONE'),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_data_lifecycle (workspace_id, opportunity_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS crm_data_lifecycle_state_idx
    ON crm_data_lifecycle (workspace_id, state, updated_at DESC);

-- Conversation records need an explicit terminal privacy state rather than being mislabeled as failed processing.
ALTER TABLE crm_conversation_events
    DROP CONSTRAINT IF EXISTS crm_conversation_events_processing_state_check;
ALTER TABLE crm_conversation_events
    ADD CONSTRAINT crm_conversation_events_processing_state_check
    CHECK (processing_state IN ('RECEIVED', 'ROUTED', 'DEAD_LETTER', 'REDACTED'));

-- Undelivered CRM outbox work must become terminally non-deliverable after primary redaction.
ALTER TABLE crm_outbox
    DROP CONSTRAINT IF EXISTS crm_outbox_delivery_state_check;
ALTER TABLE crm_outbox
    ADD CONSTRAINT crm_outbox_delivery_state_check
    CHECK (delivery_state IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'SUPPRESSED'));

-- Preserve evidence immutability while permitting one narrowly-defined privacy sanitization of manager handoff PII.
CREATE OR REPLACE FUNCTION norautomatch_reject_immutable_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'crm_manager_handoffs' AND TG_OP = 'UPDATE' THEN
        IF (
            (to_jsonb(NEW) - 'desk_prep') = (to_jsonb(OLD) - 'desk_prep')
            AND NEW.desk_prep = '{"protocol":"NORAUTO_DESK_PREP_V1","redacted":true}'::jsonb
            AND EXISTS (
                SELECT 1
                  FROM crm_data_lifecycle l
                 WHERE l.workspace_id = OLD.workspace_id
                   AND l.opportunity_id = OLD.opportunity_id
                   AND l.state = 'REDACTION_REQUESTED'
                   AND l.request_ref IS NOT NULL
                   AND l.request_authority IS NOT NULL
                   AND l.requested_at IS NOT NULL
            )
        ) THEN
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION 'NorAutoMatch immutable evidence/receipt rows cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION norautomatch_touch_data_lifecycle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_data_lifecycle_touch_updated_at ON crm_data_lifecycle;
CREATE TRIGGER crm_data_lifecycle_touch_updated_at
BEFORE UPDATE ON crm_data_lifecycle
FOR EACH ROW EXECUTE FUNCTION norautomatch_touch_data_lifecycle_updated_at();

DROP TRIGGER IF EXISTS crm_data_lifecycle_receipt_immutable ON crm_data_lifecycle_redaction_receipts;
CREATE TRIGGER crm_data_lifecycle_receipt_immutable
BEFORE UPDATE OR DELETE ON crm_data_lifecycle_redaction_receipts
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_immutable_mutation();

-- A redacted opportunity is operationally terminal without manufacturing SOLD/LOST truth.
CREATE OR REPLACE FUNCTION norautomatch_reject_operational_mutation_after_redaction()
RETURNS TRIGGER AS $$
DECLARE
    target_workspace TEXT;
    target_opportunity TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_workspace := OLD.workspace_id;
    ELSE
        target_workspace := NEW.workspace_id;
    END IF;

    IF TG_TABLE_NAME = 'crm_outbox' THEN
        IF TG_OP = 'DELETE' THEN
            target_opportunity := OLD.aggregate_id;
        ELSE
            target_opportunity := NEW.aggregate_id;
        END IF;
    ELSE
        IF TG_OP = 'DELETE' THEN
            target_opportunity := OLD.opportunity_id;
        ELSE
            target_opportunity := NEW.opportunity_id;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM crm_data_lifecycle l
         WHERE l.workspace_id = target_workspace
           AND l.opportunity_id = target_opportunity
           AND l.state IN ('PRIMARY_REDACTED_BACKUP_PENDING', 'PRIMARY_REDACTED_BACKUP_EXPIRED')
    ) THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_OPERATION_SUPPRESSED';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_opportunity_lifecycle_guard ON crm_opportunities;
CREATE TRIGGER crm_opportunity_lifecycle_guard
BEFORE UPDATE ON crm_opportunities
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_operational_mutation_after_redaction();

DROP TRIGGER IF EXISTS crm_evidence_lifecycle_guard ON crm_evidence;
CREATE TRIGGER crm_evidence_lifecycle_guard
BEFORE INSERT ON crm_evidence
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_operational_mutation_after_redaction();

DROP TRIGGER IF EXISTS crm_manager_handoff_lifecycle_guard ON crm_manager_handoffs;
CREATE TRIGGER crm_manager_handoff_lifecycle_guard
BEFORE INSERT ON crm_manager_handoffs
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_operational_mutation_after_redaction();

DROP TRIGGER IF EXISTS crm_manager_receipt_lifecycle_guard ON crm_manager_review_receipts;
CREATE TRIGGER crm_manager_receipt_lifecycle_guard
BEFORE INSERT ON crm_manager_review_receipts
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_operational_mutation_after_redaction();

DROP TRIGGER IF EXISTS crm_outbox_lifecycle_guard ON crm_outbox;
CREATE TRIGGER crm_outbox_lifecycle_guard
BEFORE INSERT OR UPDATE ON crm_outbox
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_operational_mutation_after_redaction();

DROP TRIGGER IF EXISTS crm_follow_up_lifecycle_guard ON crm_follow_up_obligations;
CREATE TRIGGER crm_follow_up_lifecycle_guard
BEFORE INSERT OR UPDATE ON crm_follow_up_obligations
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_operational_mutation_after_redaction();

CREATE OR REPLACE FUNCTION norautomatch_apply_primary_redaction(
    p_workspace_id TEXT,
    p_opportunity_id TEXT,
    p_redacted_at TIMESTAMPTZ
)
RETURNS TABLE (
    receipt_id UUID,
    conversation_targets_redacted INTEGER
) AS $$
DECLARE
    lifecycle crm_data_lifecycle%ROWTYPE;
    conversation_count INTEGER := 0;
    inserted_receipt UUID;
BEGIN
    SELECT * INTO lifecycle
      FROM crm_data_lifecycle
     WHERE workspace_id = p_workspace_id
       AND opportunity_id = p_opportunity_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_RECORD_NOT_FOUND';
    END IF;

    IF lifecycle.state = 'LEGAL_HOLD' THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_BLOCKED_BY_LEGAL_HOLD';
    END IF;

    IF lifecycle.state IN ('PRIMARY_REDACTED_BACKUP_PENDING', 'PRIMARY_REDACTED_BACKUP_EXPIRED') THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_ALREADY_REDACTED';
    END IF;

    IF lifecycle.state <> 'REDACTION_REQUESTED'
       OR lifecycle.request_ref IS NULL
       OR lifecycle.request_authority IS NULL
       OR lifecycle.requested_at IS NULL THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_REDACTION_REQUEST_NOT_EVIDENCE_BOUND';
    END IF;

    UPDATE crm_manager_handoffs
       SET desk_prep = '{"protocol":"NORAUTO_DESK_PREP_V1","redacted":true}'::jsonb
     WHERE workspace_id = p_workspace_id
       AND opportunity_id = p_opportunity_id;

    UPDATE crm_opportunities
       SET customer = '{"redacted":true}'::jsonb,
           buying_intent = '{"redacted":true}'::jsonb,
           attribution = '{"redacted":true}'::jsonb
     WHERE workspace_id = p_workspace_id
       AND opportunity_id = p_opportunity_id;

    UPDATE crm_outbox
       SET payload = '{"redacted":true,"reason":"DATA_LIFECYCLE_PRIMARY_REDACTION"}'::jsonb,
           delivery_state = CASE WHEN delivery_state = 'DELIVERED' THEN 'DELIVERED' ELSE 'SUPPRESSED' END,
           claim_token = NULL,
           claimed_at = NULL,
           claim_expires_at = NULL,
           next_attempt_at = NULL,
           last_error = NULL
     WHERE workspace_id = p_workspace_id
       AND aggregate_id = p_opportunity_id;

    UPDATE crm_conversation_events e
       SET normalized_payload = '{"protocol":"IGNIAQUA_CONVERSATION_EVENT_V1","redacted":true}'::jsonb,
           routing_decision = 'NOT_CONTACTABLE',
           routing_reasons = '["DATA_LIFECYCLE_REDACTED"]'::jsonb,
           processing_state = 'REDACTED'
      FROM crm_data_lifecycle_conversation_targets t
     WHERE t.workspace_id = p_workspace_id
       AND t.opportunity_id = p_opportunity_id
       AND e.workspace_id = t.workspace_id
       AND e.provider = t.provider
       AND e.event_id = t.event_id;
    GET DIAGNOSTICS conversation_count = ROW_COUNT;

    UPDATE crm_data_lifecycle
       SET state = 'PRIMARY_REDACTED_BACKUP_PENDING',
           primary_redacted_at = p_redacted_at,
           backup_disposition = CASE
               WHEN backup_disposition = 'NOT_APPLICABLE' THEN 'NOT_APPLICABLE'
               ELSE 'PENDING_EXPIRY'
           END,
           local_conversation_disposition = CASE
               WHEN conversation_count = 0 THEN 'NO_EXPLICIT_TARGETS_DECLARED'
               ELSE 'EXPLICIT_TARGETS_REDACTED_SCOPE_NOT_PROVEN_COMPLETE'
           END
     WHERE workspace_id = p_workspace_id
       AND opportunity_id = p_opportunity_id;

    INSERT INTO crm_data_lifecycle_redaction_receipts (
        workspace_id,
        opportunity_id,
        request_ref,
        primary_redacted_at,
        conversation_targets_redacted,
        backup_disposition,
        external_copy_truth
    ) VALUES (
        p_workspace_id,
        p_opportunity_id,
        lifecycle.request_ref,
        p_redacted_at,
        conversation_count,
        CASE WHEN lifecycle.backup_disposition = 'NOT_APPLICABLE' THEN 'UNKNOWN' ELSE 'PENDING_EXPIRY' END,
        lifecycle.external_copies
    ) RETURNING crm_data_lifecycle_redaction_receipts.receipt_id INTO inserted_receipt;

    RETURN QUERY SELECT inserted_receipt, conversation_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE crm_data_lifecycle IS 'Evidence-bound customer PII lifecycle overlay. Primary redaction does not prove backup or external-copy deletion.';
COMMENT ON TABLE crm_data_lifecycle_conversation_targets IS 'Explicit conversation-event targets attached to a lifecycle request; absence never proves no other local copies exist.';
COMMENT ON TABLE crm_data_lifecycle_redaction_receipts IS 'Append-only receipt for primary-record redaction only; backup and external copy truth remain separately bounded.';
