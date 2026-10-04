-- NorAutoMatch CRM Persistence v5 — Machine Assertion Replay Ledger
-- Durable one-time nonce consumption for authenticated internal machine callers.

CREATE TABLE IF NOT EXISTS crm_machine_assertion_nonces (
    workspace_id TEXT NOT NULL,
    audience TEXT NOT NULL CHECK (audience IN ('CONVERSATION_GATEWAY', 'CRM_RELAY')),
    issuer_service TEXT NOT NULL,
    nonce TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (expires_at > issued_at),
    CHECK (char_length(nonce) BETWEEN 16 AND 256),
    PRIMARY KEY (workspace_id, audience, issuer_service, nonce)
);

CREATE INDEX IF NOT EXISTS crm_machine_assertion_nonces_expiry_idx
    ON crm_machine_assertion_nonces (expires_at);

COMMENT ON TABLE crm_machine_assertion_nonces IS 'Durable replay ledger for short-lived internal machine assertions. A duplicate primary key means the same scoped nonce was already consumed.';
COMMENT ON COLUMN crm_machine_assertion_nonces.nonce IS 'Bounded assertion nonce. Not an authentication secret; uniqueness is scoped by workspace, audience, and issuer service.';
