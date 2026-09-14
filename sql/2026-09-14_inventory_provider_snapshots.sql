CREATE TABLE IF NOT EXISTS inventory_provider_snapshots (
  id BIGSERIAL PRIMARY KEY,
  provider_id TEXT NOT NULL,
  dealership_id TEXT NOT NULL,
  dealership_name TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  source_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  normalized_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, dealership_id, fetched_at)
);

CREATE INDEX IF NOT EXISTS inventory_provider_snapshots_latest_idx
  ON inventory_provider_snapshots (provider_id, dealership_id, fetched_at DESC);

-- This table stores immutable normalized snapshots. It does not itself make a
-- snapshot customer-visible, infer sold status, or grant source authorization.
