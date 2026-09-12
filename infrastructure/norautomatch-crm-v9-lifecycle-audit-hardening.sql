-- NorAutoMatch CRM Persistence v9 — lifecycle audit immutability and identifier hygiene
-- Durable lifecycle evidence is machine-addressable, bounded, and write-once.

ALTER TABLE crm_data_lifecycle
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_request_ref_identifier,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_request_authority_identifier,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_hold_ref_identifier,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_hold_authority_identifier,
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_backup_ref_identifier;

ALTER TABLE crm_data_lifecycle
    ADD CONSTRAINT crm_data_lifecycle_request_ref_identifier CHECK (
        request_ref IS NULL OR (
            char_length(request_ref) <= 256
            AND request_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_request_authority_identifier CHECK (
        request_authority IS NULL OR (
            char_length(request_authority) <= 128
            AND request_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_hold_ref_identifier CHECK (
        legal_hold_ref IS NULL OR (
            char_length(legal_hold_ref) <= 256
            AND legal_hold_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_hold_authority_identifier CHECK (
        legal_hold_authority IS NULL OR (
            char_length(legal_hold_authority) <= 128
            AND legal_hold_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
        )
    ),
    ADD CONSTRAINT crm_data_lifecycle_backup_ref_identifier CHECK (
        backup_disposition_ref IS NULL OR (
            char_length(backup_disposition_ref) <= 256
            AND backup_disposition_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
        )
    );

ALTER TABLE crm_data_lifecycle_conversation_targets
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_target_ref_identifier;
ALTER TABLE crm_data_lifecycle_conversation_targets
    ADD CONSTRAINT crm_data_lifecycle_target_ref_identifier CHECK (
        char_length(target_ref) <= 256
        AND target_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
    );

ALTER TABLE crm_data_lifecycle_redaction_receipts
    DROP CONSTRAINT IF EXISTS crm_data_lifecycle_receipt_request_ref_identifier;
ALTER TABLE crm_data_lifecycle_redaction_receipts
    ADD CONSTRAINT crm_data_lifecycle_receipt_request_ref_identifier CHECK (
        char_length(request_ref) <= 256
        AND request_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
    );

-- Evidence identity is write-once even when a caller changes lifecycle state.
-- Non-evidence truth fields can still evolve under their own bounded rules.
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
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:legal_hold_ref';
    END IF;
    IF OLD.legal_hold_authority IS NOT NULL AND NEW.legal_hold_authority IS DISTINCT FROM OLD.legal_hold_authority THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:legal_hold_authority';
    END IF;
    IF OLD.legal_hold_observed_at IS NOT NULL AND NEW.legal_hold_observed_at IS DISTINCT FROM OLD.legal_hold_observed_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:legal_hold_observed_at';
    END IF;
    IF OLD.primary_redacted_at IS NOT NULL AND NEW.primary_redacted_at IS DISTINCT FROM OLD.primary_redacted_at THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:primary_redacted_at';
    END IF;
    IF OLD.backup_disposition_ref IS NOT NULL AND NEW.backup_disposition_ref IS DISTINCT FROM OLD.backup_disposition_ref THEN
        RAISE EXCEPTION 'DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:backup_disposition_ref';
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

    RAISE EXCEPTION 'DATA_LIFECYCLE_INVALID_STATE_TRANSITION:%->%', OLD.state, NEW.state;
END;
$$ LANGUAGE plpgsql;

COMMENT ON CONSTRAINT crm_data_lifecycle_request_ref_identifier ON crm_data_lifecycle IS
    'Lifecycle evidence references are machine identifiers, not free-form customer text.';
COMMENT ON CONSTRAINT crm_data_lifecycle_hold_ref_identifier ON crm_data_lifecycle IS
    'Legal-hold evidence references are machine identifiers, not free-form customer text.';
COMMENT ON FUNCTION norautomatch_enforce_data_lifecycle_transition() IS
    'Enforces monotonic lifecycle states and write-once lifecycle evidence identity.';
