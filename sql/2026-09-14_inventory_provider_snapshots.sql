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

CREATE TABLE IF NOT EXISTS inventory_provider_current_state (
  provider_id TEXT NOT NULL,
  dealership_id TEXT NOT NULL,
  dealership_name TEXT NOT NULL,
  vin TEXT NOT NULL,
  state_record JSONB NOT NULL,
  snapshot_fetched_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, dealership_id, vin)
);

CREATE INDEX IF NOT EXISTS inventory_provider_current_state_snapshot_idx
  ON inventory_provider_current_state (provider_id, dealership_id, snapshot_fetched_at DESC);

-- Raw snapshots are immutable source evidence. The current-state table is a
-- reconstructed operational view that may carry inferred missing states across
-- snapshots. Neither table grants source authorization or customer visibility.
