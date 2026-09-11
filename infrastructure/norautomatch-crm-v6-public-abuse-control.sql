-- NorAutoMatch CRM v6: distributed public abuse control
-- Security control only. This table stores pseudonymous network-subject hashes,
-- never raw IP/network identifiers and never customer truth.

CREATE TABLE IF NOT EXISTS public_abuse_buckets (
    bucket_key TEXT NOT NULL CHECK (char_length(bucket_key) BETWEEN 1 AND 100),
    subject_hash CHAR(64) NOT NULL CHECK (subject_hash ~ '^[0-9a-f]{64}$'),
    window_started_at TIMESTAMPTZ NOT NULL,
    window_expires_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (bucket_key, subject_hash),
    CONSTRAINT public_abuse_window_order CHECK (window_expires_at > window_started_at)
);

CREATE INDEX IF NOT EXISTS public_abuse_window_expiry_idx
    ON public_abuse_buckets (window_expires_at);

COMMENT ON TABLE public_abuse_buckets IS
    'Distributed public-request abuse counters keyed only by bounded bucket name and HMAC-pseudonymized network subject. No raw IP or customer truth is stored.';
