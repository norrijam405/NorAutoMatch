-- NorAutoMatch CRM Persistence v11 — Durable Manager Session Revocation
-- Append-only, workspace-scoped revocation evidence for short-lived manager sessions.
-- Raw bearer tokens and raw nonces are intentionally not persisted.

CREATE TABLE IF NOT EXISTS crm_manager_session_revocations (
    workspace_id TEXT NOT NULL,
    nonce_sha256 CHAR(64) NOT NULL CHECK (nonce_sha256 ~ '^[0-9a-f]{64}$'),
    subject_id TEXT NOT NULL,
    session_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL,
    revoked_by TEXT NOT NULL CHECK (revoked_by ~ '^[A-Z][A-Z0-9_:-]{1,127}$'),
    evidence_ref TEXT NOT NULL CHECK (evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{2,511}$'),
    reason_code TEXT NOT NULL CHECK (reason_code ~ '^[A-Z][A-Z0-9_:-]{1,127}$'),
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

COMMENT ON TABLE crm_manager_session_revocations IS 'Append-only durable manager-session revocation evidence. Stores a SHA-256 nonce fingerprint rather than the raw bearer token or raw nonce.';
COMMENT ON COLUMN crm_manager_session_revocations.nonce_sha256 IS 'SHA-256 fingerprint of the manager session nonce; raw nonce is not persisted.';
