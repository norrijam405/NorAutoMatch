-- NorAutoMatch CRM Persistence v11 — Durable Manager Session Revocation
-- Revocation truth must survive process restart and must remain workspace-scoped.

CREATE TABLE IF NOT EXISTS crm_manager_session_revocations (
    workspace_id TEXT NOT NULL,
    nonce_sha256 CHAR(64) NOT NULL CHECK (nonce_sha256 ~ '^[0-9a-f]{64}$'),
    subject_id TEXT NOT NULL CHECK (char_length(subject_id) BETWEEN 1 AND 256),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL,
    revocation_ref TEXT NOT NULL CHECK (
        char_length(revocation_ref) BETWEEN 3 AND 256
        AND revocation_ref ~ '^[A-Za-z][A-Za-z0-9._-]{1,63}:[A-Za-z0-9._/-]*[A-Za-z][A-Za-z0-9._:/-]*$'
    ),
    revocation_authority TEXT NOT NULL CHECK (
        char_length(revocation_authority) BETWEEN 3 AND 128
        AND revocation_authority ~ '^[A-Z][A-Z0-9_:-]{2,127}$'
    ),
    authority_effect TEXT NOT NULL DEFAULT 'NONE' CHECK (authority_effect = 'NONE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, nonce_sha256),
    CHECK (expires_at > revoked_at)
);

CREATE INDEX IF NOT EXISTS crm_manager_session_revocations_expiry_idx
    ON crm_manager_session_revocations (expires_at);

CREATE OR REPLACE FUNCTION norautomatch_reject_manager_revocation_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'MANAGER_SESSION_REVOCATION_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_manager_session_revocations_immutable ON crm_manager_session_revocations;
CREATE TRIGGER crm_manager_session_revocations_immutable
BEFORE UPDATE OR DELETE ON crm_manager_session_revocations
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_manager_revocation_mutation();

COMMENT ON TABLE crm_manager_session_revocations IS 'Append-only, workspace-scoped durable manager-session revocation ledger. Nonces are stored only as SHA-256 digests.';
COMMENT ON COLUMN crm_manager_session_revocations.nonce_sha256 IS 'SHA-256 digest of the bounded manager-session nonce; raw nonce is not persisted.';
