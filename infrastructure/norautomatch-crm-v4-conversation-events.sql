-- NorAutoMatch CRM Persistence v4 — Conversation-to-Action Event Ledger
-- Stores normalized provider events with replay-safe identity and provenance.

CREATE TABLE IF NOT EXISTS crm_conversation_events (
    workspace_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'CONVERSATION_ENDED_OR_HANDOFF_READY',
        'CONTACT_INFORMATION_SUBMITTED',
        'LEAD_DELIVERED_TO_CRM'
    )),
    observed_at TIMESTAMPTZ NOT NULL,
    source_ref TEXT,
    source_hash CHAR(64) CHECK (source_hash IS NULL OR source_hash ~ '^[0-9a-f]{64}$'),
    normalized_payload JSONB NOT NULL,
    routing_decision TEXT NOT NULL CHECK (routing_decision IN ('CONTACTABLE', 'HUMAN_REVIEW_REQUIRED', 'NOT_CONTACTABLE')),
    routing_reasons JSONB NOT NULL,
    processing_state TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (processing_state IN ('RECEIVED', 'ROUTED', 'DEAD_LETTER')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, provider, event_id)
);

CREATE INDEX IF NOT EXISTS crm_conversation_events_conversation_idx
    ON crm_conversation_events (workspace_id, provider, conversation_id, observed_at);

CREATE INDEX IF NOT EXISTS crm_conversation_events_processing_idx
    ON crm_conversation_events (workspace_id, processing_state, received_at);

COMMENT ON TABLE crm_conversation_events IS 'Provider-neutral normalized conversation-event ledger. Event identity is replay-safe per workspace/provider/event_id.';
COMMENT ON COLUMN crm_conversation_events.normalized_payload IS 'Validated IGNIAQUA_CONVERSATION_EVENT_V1 payload. authorityEffect remains NONE.';
COMMENT ON COLUMN crm_conversation_events.processing_state IS 'RECEIVED is durable intake only; ROUTED requires a separate downstream durable action; DEAD_LETTER preserves failed processing.';
