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

-- Preserve any evidence/state already written by V12 before runtime moves to
-- the private schema. Snapshot identity collisions remain impossible because
-- the V12 uniqueness key is retained.
INSERT INTO igniaqua.inventory_provider_snapshots (
  provider_id, dealership_id, dealership_name, fetched_at, source_url,
  source_hash, normalized_snapshot, created_at
)
SELECT provider_id, dealership_id, dealership_name, fetched_at, source_url,
       source_hash, normalized_snapshot, created_at
  FROM public.inventory_provider_snapshots
ON CONFLICT (provider_id, dealership_id, fetched_at) DO NOTHING;

INSERT INTO igniaqua.inventory_provider_current_state (
  provider_id, dealership_id, dealership_name, as_of, source_url,
  source_hash, state_json, updated_at
)
SELECT provider_id, dealership_id, dealership_name, as_of, source_url,
       source_hash, state_json, updated_at
  FROM public.inventory_provider_current_state
ON CONFLICT (provider_id, dealership_id) DO UPDATE SET
  dealership_name = EXCLUDED.dealership_name,
  as_of = EXCLUDED.as_of,
  source_url = EXCLUDED.source_url,
  source_hash = EXCLUDED.source_hash,
  state_json = EXCLUDED.state_json,
  updated_at = EXCLUDED.updated_at
WHERE EXCLUDED.as_of >= igniaqua.inventory_provider_current_state.as_of;

ALTER TABLE igniaqua.inventory_provider_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE igniaqua.inventory_provider_current_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_provider_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_provider_current_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE igniaqua.inventory_provider_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE igniaqua.inventory_provider_current_state FROM PUBLIC;
REVOKE ALL ON SEQUENCE igniaqua.inventory_provider_snapshots_id_seq FROM PUBLIC;
REVOKE ALL ON TABLE public.inventory_provider_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE public.inventory_provider_current_state FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.inventory_provider_snapshots_id_seq FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA igniaqua FROM anon;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_snapshots FROM anon;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_current_state FROM anon;
    REVOKE ALL ON SEQUENCE igniaqua.inventory_provider_snapshots_id_seq FROM anon;
    REVOKE ALL ON TABLE public.inventory_provider_snapshots FROM anon;
    REVOKE ALL ON TABLE public.inventory_provider_current_state FROM anon;
    REVOKE ALL ON SEQUENCE public.inventory_provider_snapshots_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA igniaqua FROM authenticated;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_snapshots FROM authenticated;
    REVOKE ALL ON TABLE igniaqua.inventory_provider_current_state FROM authenticated;
    REVOKE ALL ON SEQUENCE igniaqua.inventory_provider_snapshots_id_seq FROM authenticated;
    REVOKE ALL ON TABLE public.inventory_provider_snapshots FROM authenticated;
    REVOKE ALL ON TABLE public.inventory_provider_current_state FROM authenticated;
    REVOKE ALL ON SEQUENCE public.inventory_provider_snapshots_id_seq FROM authenticated;
  END IF;
END
$$;

-- V12 remains byte-for-byte immutable. V13 copies forward existing V12 evidence,
-- locks the legacy public tables against browser roles, and moves active runtime
-- cache reads/writes to the private schema. No customer visibility is granted.
