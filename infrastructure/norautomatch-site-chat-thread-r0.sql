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


create or replace function norauto_enforce_site_chat_reply_access_at_commit()
returns trigger
language plpgsql
as $$
declare
  active_expires_at timestamptz;
begin
  select expires_at
    into active_expires_at
    from crm_site_chat_access
   where workspace_id = new.workspace_id
     and conversation_id = new.conversation_id
   for update;

  if active_expires_at is null or active_expires_at <= clock_timestamp() then
    raise exception 'SITE_CHAT_REPLY_THREAD_NOT_ACTIVE';
  end if;

  return new;
end;
$$;

drop trigger if exists crm_site_chat_reply_access_commit_guard on crm_site_chat_replies;

create constraint trigger crm_site_chat_reply_access_commit_guard
after insert on crm_site_chat_replies
deferrable initially deferred
for each row
execute function norauto_enforce_site_chat_reply_access_at_commit();

comment on function norauto_enforce_site_chat_reply_access_at_commit() is
  'Deferred commit-time guard: same-site reply commit requires an access row that remains present and unexpired at commit. The access row is locked through commit.';


create or replace function norauto_enforce_site_chat_reply_insert_truth()
returns trigger
language plpgsql
as $$
declare
  event_processing_state text;
  current_assignment_state text;
  current_assignee text;
begin
  select e.processing_state
    into event_processing_state
    from crm_conversation_events e
   where e.workspace_id = new.workspace_id
     and e.provider = 'NORAUTO_SITE_CHAT'
     and e.event_id = new.source_event_id
     and e.conversation_id = new.conversation_id
   for share;

  if event_processing_state is null
     or event_processing_state in ('DEAD_LETTER','REDACTED') then
    raise exception 'SITE_CHAT_REPLY_EVENT_NOT_ELIGIBLE';
  end if;

  select a.assignment_state, a.assignee_subject_id
    into current_assignment_state, current_assignee
    from crm_conversation_assignments a
   where a.workspace_id = new.workspace_id
     and a.provider = 'NORAUTO_SITE_CHAT'
     and a.conversation_id = new.conversation_id
   for update;

  if current_assignment_state is distinct from 'ASSIGNED'
     or current_assignee is distinct from new.published_by then
    raise exception 'SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists crm_site_chat_reply_insert_truth_guard
  on crm_site_chat_replies;
create trigger crm_site_chat_reply_insert_truth_guard
before insert on crm_site_chat_replies
for each row
execute function norauto_enforce_site_chat_reply_insert_truth();
