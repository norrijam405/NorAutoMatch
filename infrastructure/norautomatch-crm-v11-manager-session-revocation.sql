-- NorAutoMatch CRM Persistence v11 — Durable Manager Session Revocation
-- Append-only, workspace-scoped revocation evidence for short-lived manager sessions.
-- Raw bearer tokens, raw nonces, and raw manager subject identifiers are intentionally not persisted.

CREATE TABLE IF NOT EXISTS crm_manager_session_revocations (
    workspace_id TEXT NOT NULL,
    nonce_sha256 CHAR(64) NOT NULL CHECK (nonce_sha256 ~ '^[0-9a-f]{64}$'),
    subject_id_sha256 CHAR(64) NOT NULL CHECK (subject_id_sha256 ~ '^[0-9a-f]{64}$'),
    session_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL,
    revoked_by TEXT NOT NULL CHECK (
        char_length(revoked_by) BETWEEN 2 AND 128
        AND revoked_by ~ '^[A-Z][A-Z0-9_:-]+$'
    ),
    evidence_ref TEXT NOT NULL CHECK (
        char_length(evidence_ref) BETWEEN 3 AND 512
        AND evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]+$'
    ),
    reason_code TEXT NOT NULL CHECK (
        char_length(reason_code) BETWEEN 2 AND 128
        AND reason_code ~ '^[A-Z][A-Z0-9_:-]+$'
    ),
    CHECK (session_expires_at > revoked_at),
    PRIMARY KEY (workspace_id, nonce_sha256)
);

CREATE INDEX IF NOT EXISTS crm_manager_session_revocations_expiry_idx
    ON crm_manager_session_revocations (session_expires_at);

CREATE OR REPLACE FUNCTION norautomatch_reject_manager_session_revocation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'NorAutoMatch manager session revocations are append-only';
END;
$$;

DROP TRIGGER IF EXISTS crm_manager_session_revocations_immutable ON crm_manager_session_revocations;
CREATE TRIGGER crm_manager_session_revocations_immutable
BEFORE UPDATE OR DELETE ON crm_manager_session_revocations
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_manager_session_revocation_mutation();

COMMENT ON TABLE crm_manager_session_revocations IS 'Append-only durable manager-session revocation evidence. Stores SHA-256 nonce and subject fingerprints rather than raw bearer/session identity values.';
COMMENT ON COLUMN crm_manager_session_revocations.nonce_sha256 IS 'SHA-256 fingerprint of the manager session nonce; raw nonce is not persisted.';
COMMENT ON COLUMN crm_manager_session_revocations.subject_id_sha256 IS 'SHA-256 fingerprint of the manager subject identifier; raw manager subject identity is not persisted.';
