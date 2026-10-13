-- NorAutoMatch Torque Vehicle Hunt + Scout Opportunity R0
-- Create-only migration. No production authority is implied by this file.

CREATE TABLE IF NOT EXISTS torque_vehicle_hunts (
  hunt_id TEXT PRIMARY KEY CHECK (hunt_id ~ '^namh_[0-9a-f]{24}$'),
  workspace_id TEXT NOT NULL,
  opportunity_id TEXT,
  user_id UUID,
  origin TEXT NOT NULL CHECK (origin IN ('TORQUE_CHAT','FRESH_UP','GARAGE','MANUAL_SALESPERSON')),
  state TEXT NOT NULL CHECK (state IN (
    'CAPTURING','SEARCHING','LOCAL_MATCH_FOUND','NETWORK_MATCH_FOUND',
    'OUT_OF_NETWORK_MATCH_FOUND','AWAITING_HUMAN_VERIFICATION',
    'CUSTOMER_REVIEW','PAUSED','CLOSED'
  )),
  requirements JSONB NOT NULL,
  explicit_customer_text TEXT NOT NULL CHECK (char_length(explicit_customer_text) BETWEEN 1 AND 4000),
  match_dna_label TEXT,
  candidate_vins JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_contact_order JSONB NOT NULL DEFAULT '["TEXT","EMAIL"]'::jsonb,
  consent_to_contact BOOLEAN NOT NULL DEFAULT FALSE,
  salesperson_owner TEXT,
  truth JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (updated_at >= created_at)
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
  topic TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  affected_makes JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  market TEXT,
  effective_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  observed_at TIMESTAMPTZ NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_class TEXT NOT NULL CHECK (source_class IN (
    'OEM_OFFICIAL','GOVERNMENT','INDUSTRY_DATA','TRADE_PRESS','DEALER_PUBLIC','SECONDARY_MEDIA'
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS industry_scout_observations_recent_idx
  ON industry_scout_observations (observed_at DESC);

CREATE TABLE IF NOT EXISTS scout_opportunity_matches (
  observation_id TEXT NOT NULL REFERENCES industry_scout_observations(observation_id) ON DELETE CASCADE,
  hunt_id TEXT NOT NULL REFERENCES torque_vehicle_hunts(hunt_id) ON DELETE CASCADE,
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
  PRIMARY KEY (observation_id, hunt_id)
);

CREATE INDEX IF NOT EXISTS scout_opportunity_matches_queue_idx
  ON scout_opportunity_matches (action, score DESC, created_at DESC)
  WHERE action <> 'NO_ACTION';

-- Public/anonymous database roles receive no direct grants. Application/service
-- access remains behind the existing workspace/manager authorization boundaries.
