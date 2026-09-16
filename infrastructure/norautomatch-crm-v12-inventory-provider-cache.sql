CREATE SCHEMA IF NOT EXISTS igniaqua;
REVOKE ALL ON SCHEMA igniaqua FROM PUBLIC;

CREATE TABLE IF NOT EXISTS igniaqua.inventory_provider_snapshots (
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
  ON igniaqua.inventory_provider_snapshots (provider_id, dealership_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS igniaqua.inventory_provider_current_state (
  provider_id TEXT NOT NULL,
  dealership_id TEXT NOT NULL,
  dealership_name TEXT NOT NULL,
  as_of TIMESTAMPTZ NOT NULL,
  source_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, dealership_id)
);

ALTER TABLE igniaqua.inventory_provider_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE igniaqua.inventory_provider_current_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE igniaqua.inventory_provider_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE igniaqua.inventory_provider_current_state FROM PUBLIC;
REVOKE ALL ON SEQUENCE igniaqua.inventory_provider_snapshots_id_seq FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA igniaqua FROM anon;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_snapshots FROM anon;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_current_state FROM anon;
    REVOKE ALL ON SEQUENCE igniaqua.inventory_provider_snapshots_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA igniaqua FROM authenticated;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_snapshots FROM authenticated;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_current_state FROM authenticated;
    REVOKE ALL ON SEQUENCE igniaqua.inventory_provider_snapshots_id_seq FROM authenticated;
  END IF;
END
$$;

-- Raw snapshots are immutable source evidence. The current-state table is a
-- reconstructed operational view that may carry inferred missing states across
-- snapshots. Neither table grants source authorization or customer visibility.
-- Customer-safe inventory belongs in the separately governed public projection;
-- raw provider cache state is server-only and intentionally outside browser roles.
