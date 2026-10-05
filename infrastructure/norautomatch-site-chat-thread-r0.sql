-- NorAutoMatch R2 same-site Ask Torque reply transport.
-- Website thread delivery only. No email/SMS/provider send authority.

create table if not exists crm_site_chat_access (
  workspace_id text not null,
  conversation_id text not null,
  access_token_hash char(64) not null check (access_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default current_timestamp,
  expires_at timestamptz not null,
  last_seen_at timestamptz null,
  primary key (workspace_id, conversation_id),
  constraint crm_site_chat_access_expiry check (expires_at > created_at)
);

create unique index if not exists crm_site_chat_access_token_hash_idx
  on crm_site_chat_access (workspace_id, access_token_hash);

create table if not exists crm_site_chat_replies (
  workspace_id text not null,
  conversation_id text not null,
  reply_id uuid not null default gen_random_uuid(),
  source_event_id text not null,
  body text not null check (char_length(body) between 1 and 3000),
  published_by text not null check (char_length(published_by) between 1 and 256),
  delivery_channel text not null default 'NORAUTO_SITE_THREAD'
    check (delivery_channel = 'NORAUTO_SITE_THREAD'),
  delivery_state text not null default 'PUBLISHED'
    check (delivery_state in ('PUBLISHED','REDACTED')),
  published_at timestamptz not null default current_timestamp,
  redacted_at timestamptz null,
  primary key (workspace_id, conversation_id, reply_id),
  constraint crm_site_chat_replies_redaction_truth check (
    (delivery_state = 'PUBLISHED' and redacted_at is null)
    or (delivery_state = 'REDACTED' and redacted_at is not null)
  )
);

create index if not exists crm_site_chat_replies_thread_idx
  on crm_site_chat_replies (workspace_id, conversation_id, published_at, reply_id);

comment on table crm_site_chat_access is
  'Hashed opaque browser capability for reading a NorAutoMatch same-site Ask Torque thread. Raw token is never stored.';
comment on table crm_site_chat_replies is
  'Human-published same-site replies only. This table does not represent SMS, email, Motive, lender, reservation, or appointment delivery.';
