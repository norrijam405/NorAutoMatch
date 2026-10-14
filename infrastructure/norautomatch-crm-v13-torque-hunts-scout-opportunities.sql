-- NorAutoMatch Torque Vehicle Hunt + Industry Scout Opportunity R0
-- Create-only migration. NO PRODUCTION AUTHORITY is implied by this file.
-- Requires the existing NorAutoMatch CRM v1 schema and immutable-mutation helper.

-- The CRM v1 key is globally unique on opportunity_id, but PostgreSQL requires a
-- matching unique key for the composite workspace-scoped Hunt foreign key.
-- Add a non-destructive supporting unique index before creating Hunt tables.
CREATE UNIQUE INDEX IF NOT EXISTS crm_opportunities_workspace_opportunity_uq_idx
  ON crm_opportunities (workspace_id, opportunity_id);

CREATE TABLE IF NOT EXISTS torque_vehicle_hunts (
  hunt_id TEXT PRIMARY KEY CHECK (hunt_id ~ '^namvh_[0-9a-f]{24}$'),
  workspace_id TEXT NOT NULL,
  opportunity_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  origin TEXT NOT NULL CHECK (origin IN (
    'TORQUE_CHAT','FRESH_UP','GARAGE','MANUAL_SALESPERSON'
  )),
  state TEXT NOT NULL CHECK (state IN (
    'CAPTURING','SEARCHING','LOCAL_MATCH_FOUND','NETWORK_MATCH_FOUND',
    'OUT_OF_NETWORK_MATCH_FOUND','AWAITING_HUMAN_VERIFICATION',
    'CUSTOMER_REVIEW','PAUSED','CLOSED'
  )),
  requirements JSONB NOT NULL,
  explicit_customer_text TEXT NOT NULL
    CHECK (char_length(explicit_customer_text) BETWEEN 1 AND 4000),
  match_dna_label TEXT,
  candidate_vins JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_contact_order JSONB NOT NULL DEFAULT '["TEXT","EMAIL"]'::jsonb,
  consent_to_contact BOOLEAN NOT NULL DEFAULT FALSE,
  salesperson_owner TEXT,
  truth JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (updated_at >= created_at),
  FOREIGN KEY (workspace_id, opportunity_id)
    REFERENCES crm_opportunities (workspace_id, opportunity_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS torque_vehicle_hunts_workspace_state_idx
  ON torque_vehicle_hunts (workspace_id, state, updated_at DESC);

CREATE INDEX IF NOT EXISTS torque_vehicle_hunts_opportunity_idx
  ON torque_vehicle_hunts (workspace_id, opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS torque_vehicle_hunts_user_idx
  ON torque_vehicle_hunts (user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS industry_scout_observations (
  observation_id TEXT PRIMARY KEY,
  topic TEXT NOT NULL CHECK (topic IN (
    'INCENTIVE','APR_LEASE_PROGRAM','MODEL_LAUNCH','MODEL_REFRESH',
    'TRIM_FEATURE_CHANGE','PRICING','INVENTORY_SUPPLY','SALES_VOLUME',
    'MARKET_SHARE','CONSUMER_DEMAND','EV_HYBRID','RECALL_SAFETY',
    'COMPETITOR_MOVE','REGULATION','OWNERSHIP_COST'
  )),
  headline TEXT NOT NULL CHECK (char_length(headline) BETWEEN 1 AND 500),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 8000),
  affected_makes JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  market TEXT,
  effective_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  observed_at TIMESTAMPTZ NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_class TEXT NOT NULL CHECK (source_class IN (
    'OEM_OFFICIAL','GOVERNMENT','INDUSTRY_DATA',
    'TRADE_PRESS','DEALER_PUBLIC','SECONDARY_MEDIA'
  )),
  evidence_state TEXT NOT NULL CHECK (evidence_state IN (
    'PRIMARY_VERIFIED','CORROBORATED','REPORTED','UNVERIFIED'
  )),
  sales_impact TEXT NOT NULL CHECK (sales_impact IN (
    'HIGH_OPPORTUNITY','HIGH_RISK','MEDIUM','LOW','UNKNOWN'
  )),
  torque_use TEXT NOT NULL CHECK (torque_use IN (
    'CUSTOMER_SAFE','SALESPERSON_ONLY','MANAGER_ONLY','DO_NOT_USE'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at IS NULL OR effective_at IS NULL OR expires_at >= effective_at)
);

CREATE INDEX IF NOT EXISTS industry_scout_observations_recent_idx
  ON industry_scout_observations (observed_at DESC);

CREATE TABLE IF NOT EXISTS scout_opportunity_matches (
  observation_id TEXT NOT NULL
    REFERENCES industry_scout_observations(observation_id)
    ON DELETE RESTRICT,
  hunt_id TEXT NOT NULL
    REFERENCES torque_vehicle_hunts(hunt_id)
    ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  action TEXT NOT NULL CHECK (action IN (
    'TEXT_CUSTOMER','EMAIL_CUSTOMER','SALESPERSON_REVIEW',
    'MANAGER_REVIEW','WATCH_ONLY','NO_ACTION'
  )),
  customer_safe BOOLEAN NOT NULL,
  requires_human_verification BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  PRIMARY KEY (observation_id, hunt_id),
  CHECK (reviewed_at IS NULL OR reviewed_at >= created_at)
);

CREATE INDEX IF NOT EXISTS scout_opportunity_matches_queue_idx
  ON scout_opportunity_matches (action, score DESC, created_at DESC)
  WHERE action <> 'NO_ACTION';

-- Industry observations are evidence records. They are append-only once accepted.
DROP TRIGGER IF EXISTS industry_scout_observations_immutable
  ON industry_scout_observations;
CREATE TRIGGER industry_scout_observations_immutable
BEFORE UPDATE OR DELETE ON industry_scout_observations
FOR EACH ROW EXECUTE FUNCTION norautomatch_reject_immutable_mutation();

-- Supabase/PostgREST must not expose operator intelligence directly.
ALTER TABLE torque_vehicle_hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_scout_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_opportunity_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE torque_vehicle_hunts FROM anon, authenticated;
REVOKE ALL ON TABLE industry_scout_observations FROM anon, authenticated;
REVOKE ALL ON TABLE scout_opportunity_matches FROM anon, authenticated;

COMMENT ON TABLE torque_vehicle_hunts IS
  'Canonical long-running vehicle sourcing requests. Customer identity remains in CRM; Hunt records buying/sourcing intent.';
COMMENT ON TABLE industry_scout_observations IS
  'Append-only evidence-bound automotive market observations. Observation does not itself authorize customer messaging.';
COMMENT ON TABLE scout_opportunity_matches IS
  'Derived Industry Scout to Vehicle Hunt relevance queue. Recommendations do not prove communication occurred.';
