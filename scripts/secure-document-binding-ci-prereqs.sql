create table if not exists customer_secure_documents (
  id uuid primary key,
  user_id uuid not null,
  opportunity_id text null,
  kind text not null,
  status text not null,
  received_at timestamptz not null default clock_timestamp(),
  raw_deleted_at timestamptz null
);
