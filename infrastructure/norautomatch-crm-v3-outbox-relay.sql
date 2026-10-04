-- NorAutoMatch CRM Persistence v3 — Durable Outbox Relay
-- Enables bounded concurrent claims, crash recovery, and at-least-once delivery.

ALTER TABLE crm_outbox
    ADD COLUMN IF NOT EXISTS claim_token UUID,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;

ALTER TABLE crm_outbox
    DROP CONSTRAINT IF EXISTS crm_outbox_claim_consistency;

ALTER TABLE crm_outbox
    ADD CONSTRAINT crm_outbox_claim_consistency CHECK (
        (delivery_state = 'PROCESSING' AND claim_token IS NOT NULL AND claimed_at IS NOT NULL AND claim_expires_at IS NOT NULL)
        OR
        (delivery_state <> 'PROCESSING' AND claim_token IS NULL AND claimed_at IS NULL AND claim_expires_at IS NULL)
    );

CREATE INDEX IF NOT EXISTS crm_outbox_claimable_idx
    ON crm_outbox (next_attempt_at, created_at)
    WHERE delivery_state IN ('PENDING', 'FAILED');

CREATE INDEX IF NOT EXISTS crm_outbox_expired_claim_idx
    ON crm_outbox (claim_expires_at)
    WHERE delivery_state = 'PROCESSING';

COMMENT ON COLUMN crm_outbox.claim_token IS 'Per-attempt lease token. A completion/failure update must match this token.';
COMMENT ON COLUMN crm_outbox.claim_expires_at IS 'Crash-recovery lease boundary; expired PROCESSING rows become claimable again.';
