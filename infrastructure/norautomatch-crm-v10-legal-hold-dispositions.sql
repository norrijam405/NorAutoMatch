-- NorAutoMatch CRM Persistence v10 — independent legal-hold ledger and disposition evidence
-- Legal holds are independent of primary-redaction state so remaining copies can be frozen after primary redaction.

ALTER TABLE crm_data_lifecycle
    ADD COLUMN IF NOT EXISTS backup_disposition_authority TEXT,
    ADD COLUMN IF NOT EXISTS backup_disposition_observed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS external_disposition_ref TEXT,
    ADD COLUMN IF NOT EXISTS external_disposition_authority TEXT,
    ADD COLUMN IF NOT EXISTS external_disposition_observed_at TIMESTAMPTZ;

ALTER TABLE crm_data_lifecycle
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_backup_resolution_complete,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_external_resolution_complete,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_backup_authority_identifier,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_external_ref_identifier,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_external_authority_identifier;

ALTER TABLE crm_data_lifecycle
    ADD CONSTRAINT crm_data_lifecycle_backup_resolution_complete CHECK (
        state <> 'PRIMARY_REDACTED_BACKUP_EXPIRED'
        OR (
            backup_disposition = 'EXPIRED_OR_PURGED'
            AND backup_disposition_ref IS NOT NULL
            AND backup_disposition_authority IS NOT NULL
            AND backup_disposition_observed_at IS NOT NULL
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_external_resolution_complete CHECK (
        external_copies <> 'SEPARATELY_CONFIRMED_REMOVED'
        OR (
            external_disposition_ref IS NOT NULL
            AND external_disposition_authority IS NOT NULL
            AND external_disposition_observed_at IS NOT NULL
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_backup_authority_identifier CHECK (
        backup_disposition_authority IS NULL OR (
            char_length(backup_disposition_authority) <= 128
            AND backup_disposition_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_external_ref_identifier CHECK (
        external_disposition_ref IS NULL OR (
            char_length(external_disposition_ref) <= 256
            AND external_disposition_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_external_authority_identifier CHECK (
        external_disposition_authority IS NULL OR (
            char_length(external_disposition_authority) <= 128
            AND external_disposition_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
        )
    );

CREATE TABLE IF NOT EXISTS crm_data_lifecycle_legal_holds (
    hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    hold_ref TEXT NOT NULL,
    hold_authority TEXT NOT NULL,
    placed_at TIMESTAMPTZ NOT NULL,
    release_ref TEXT,
    release_authority TEXT,
    released_at TIMESTAMPTZ,
    authority_effect TEXT NOT NULL DEFAULT 'NONE' CHECK (authority_effect = 'NONE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, opportunity_id, hold_ref),
    FOREIGN KEY (workspace_id, opportunity_id)
        REFERENCES crm_opportunities (workspace_id, opportunity_id)
        ON DELETE RESTRICT,
    CONSTRAINT crm_data_lifecycle_hold_ref_identifier CHECK (
        char_length(hold_ref) <= 256
        AND hold_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
    ),
    CONSTRAINT crm_data_lifecycle_hold_authority_identifier CHECK (
        char_length(hold_authority) <= 128
        AND hold_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
    ),
    CONSTRAINT crm_data_lifecycle_hold_release_all_or_none CHECK (
        (release_ref IS NULL AND release_authority IS NULL AND released_at IS NULL)
        OR
        (release_ref IS NOT NULL AND release_authority IS NOT NULL AND released_at IS NOT NULL)
    ),
    CONSTRAINT crm_data_lifecycle_hold_release_ref_identifier CHECK (
        release_ref IS NULL OR (
            char_length(release_ref) <= 256
            AND release_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
        )
    ),
    CONSTRAINT crm_data_lifecycle_hold_release_authority_identifier CHECK (
        release_authority IS NULL OR (
            char_length(release_authority) <= 128
            AND release_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
        )
    )
);

CREATE INDEX IF NOT EXISTS crm_data_lifecycle_active_hold_idx
    ON crm_data_lifecycle_legal_holds (workspace_id, opportunity_id, placed_at)
    WHERE released_at IS NULL;

-- Preserve any legacy v7 state-based hold as an active ledger entry without inventing new evidence.
INSERT INTO crm_data_lifecycle_legal_holds (
    workspace_id, opportunity_id, hold_ref, hold_authority, placed_at
)
SELECT workspace_id, opportunity_id, legal_hold_ref, legal_hold_authority, legal_hold_observed_at
  FROM crm_data_lifecycle
 WHERE state = 'LEGAL_HOLD'
   AND legal_hold_ref IS NOT NULL
   AND legal_hold_authority IS NOT NULL
   AND legal_hold_observed_at IS NOT NULL
ON CONFLICT (workspace_id, opportunity_id, hold_ref) DO NOTHING;

CREATE OR REPLACE FUNCTION norautomatch_reject_legal_hold_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_LEGAL_HOLD_IMMUTABLE';
    END IF;

    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id
       OR NEW.hold_ref IS DISTINCT FROM OLD.hold_ref
       OR NEW.hold_authority IS DISTINCT FROM OLD.hold_authority
       OR NEW.placed_at IS DISTINCT FROM OLD.placed_at
       OR NEW.authority_effect IS DISTINCT FROM OLD.authority_effect
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_LEGAL_HOLD_IDENTITY_IMMUTABLE';
    END IF;

    IF OLD.released_at IS NOT NULL THEN
        IF NEW.release_ref IS NOT DISTINCT FROM OLD.release_ref
           AND NEW.release_authority IS NOT DISTINCT FROM OLD.release_authority
           AND NEW.released_at IS NOT DISTINCT FROM OLD.released_at THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'DATA_LIFECYCLE_LEGAL_HOLD_RELEASE_IMMUTABLE';
    END IF;

    IF NEW.release_ref IS NOT NULL
       AND NEW.release_authority IS NOT NULL
       AND NEW.released_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'DATA_LIFECYCLE_LEGAL_HOLD_RELEASE_INCOMPLETE';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_data_lifecycle_legal_hold_immutable ON crm_data_lifecycle_legal_holds;
CREATE TRIGGER crm_data_lifecycle_legal_hold_immutable
BEFORE UPDATE OR DELETE ON crm_data_lifecycle_legal_holds
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_legal_hold_mutation();

-- Extend lifecycle evidence immutability to separately-authorized backup/external dispositions.
CREATE OR REPLACE FUNCTION norautomatch_enforce_data_lifecycle_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.request_ref IS NOT NULL AND NEW.request_ref IS DISTINCT FROM OLD.request_ref THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:request_ref';
    END IF;
    IF OLD.request_authority IS NOT NULL AND NEW.request_authority IS DISTINCT FROM OLD.request_authority THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:request_authority';
    END IF;
    IF OLD.requested_at IS NOT NULL AND NEW.requested_at IS DISTINCT FROM OLD.requested_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:requested_at';
    END IF;
    IF OLD.legal_hold_ref IS NOT NULL AND NEW.legal_hold_ref IS DISTINCT FROM OLD.legal_hold_ref THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:legacy_legal_hold_ref';
    END IF;
    IF OLD.legal_hold_authority IS NOT NULL AND NEW.legal_hold_authority IS DISTINCT FROM OLD.legal_hold_authority THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:legacy_legal_hold_authority';
    END IF;
    IF OLD.legal_hold_observed_at IS NOT NULL AND NEW.legal_hold_observed_at IS DISTINCT FROM OLD.legal_hold_observed_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:legacy_legal_hold_observed_at';
    END IF;
    IF OLD.primary_redacted_at IS NOT NULL AND NEW.primary_redacted_at IS DISTINCT FROM OLD.primary_redacted_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:primary_redacted_at';
    END IF;
    IF OLD.backup_disposition_ref IS NOT NULL AND NEW.backup_disposition_ref IS DISTINCT FROM OLD.backup_disposition_ref THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:backup_disposition_ref';
    END IF;
    IF OLD.backup_disposition_authority IS NOT NULL AND NEW.backup_disposition_authority IS DISTINCT FROM OLD.backup_disposition_authority THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:backup_disposition_authority';
    END IF;
    IF OLD.backup_disposition_observed_at IS NOT NULL AND NEW.backup_disposition_observed_at IS DISTINCT FROM OLD.backup_disposition_observed_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:backup_disposition_observed_at';
    END IF;
    IF OLD.external_disposition_ref IS NOT NULL AND NEW.external_disposition_ref IS DISTINCT FROM OLD.external_disposition_ref THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:external_disposition_ref';
    END IF;
    IF OLD.external_disposition_authority IS NOT NULL AND NEW.external_disposition_authority IS DISTINCT FROM OLD.external_disposition_authority THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:external_disposition_authority';
    END IF;
    IF OLD.external_disposition_observed_at IS NOT NULL AND NEW.external_disposition_observed_at IS DISTINCT FROM OLD.external_disposition_observed_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:external_disposition_observed_at';
    END IF;
    IF OLD.external_copies = 'SEPARATELY_CONFIRMED_REMOVED'
       AND NEW.external_copies IS DISTINCT FROM OLD.external_copies THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EXTERNAL_DISPOSITION_IMMUTABLE';
    END IF;
    IF OLD.backup_disposition = 'EXPIRED_OR_PURGED'
       AND NEW.backup_disposition IS DISTINCT FROM OLD.backup_disposition THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_BACKUP_DISPOSITION_IMMUTABLE';
    END IF;

    IF NEW.state = OLD.state THEN
        RETURN NEW;
    END IF;

    IF OLD.state = 'ACTIVE'
       AND NEW.state IN ('REDACTION_REQUESTED', 'LEGAL_HOLD') THEN
        RETURN NEW;
    END IF;

    IF OLD.state = 'REDACTION_REQUESTED'
       AND NEW.state IN ('LEGAL_HOLD', 'PRIMARY_REDACTED_BACKUP_PENDING') THEN
        RETURN NEW;
    END IF;

    IF OLD.state = 'PRIMARY_REDACTED_BACKUP_PENDING'
       AND NEW.state = 'PRIMARY_REDACTED_BACKUP_EXPIRED' THEN
        RETURN NEW;
    END IF;

    -- Compatibility path for a legacy state-based hold after every active ledger hold has been released.
    IF OLD.state = 'LEGAL_HOLD'
       AND NEW.state IN ('ACTIVE', 'REDACTION_REQUESTED')
       AND NOT EXISTS (
           SELECT 1
             FROM crm_data_lifecycle_legal_holds h
            WHERE h.workspace_id = OLD.workspace_id
              AND h.opportunity_id = OLD.opportunity_id
              AND h.released_at IS NULL
       ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'DATA_LIFECYCLE_INVALID_STATE_TRANSITION:%->%', OLD.state, NEW.state;
END;
$$ LANGUAGE plpgsql;

-- Active legal holds block primary redaction regardless of when the hold was placed.
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

    IF lifecycle.state = 'LEGAL_HOLD'
       OR EXISTS (
           SELECT 1
             FROM crm_data_lifecycle_legal_holds h
            WHERE h.workspace_id = p_workspace_id
              AND h.opportunity_id = p_opportunity_id
              AND h.released_at IS NULL
       ) THEN
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

COMMENT ON TABLE crm_data_lifecycle_legal_holds IS
    'Append-only legal-hold identities with one write-once release event; active holds independently block primary redaction and backup disposition.';
COMMENT ON COLUMN crm_data_lifecycle.backup_disposition_authority IS
    'Authority token supporting the separately observed backup expiration/purge disposition.';
COMMENT ON COLUMN crm_data_lifecycle.external_disposition_ref IS
    'Separate evidence reference required before external copies can be marked confirmed removed.';
