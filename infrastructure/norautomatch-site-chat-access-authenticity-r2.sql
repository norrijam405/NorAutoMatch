-- NorAutoMatch R2 FRC-12 pre-issuance site-chat capability authenticity.
-- Allows untrusted database rows to coexist without granting authority or blocking
-- the one authenticated application-issued browser capability for a conversation.

alter table crm_site_chat_access
  add column if not exists issuance_proof char(64)
  check (issuance_proof is null or issuance_proof ~ '^[0-9a-f]{64}$');

alter table crm_site_chat_access
  drop constraint if exists crm_site_chat_access_pkey;

alter table crm_site_chat_access
  add constraint crm_site_chat_access_pkey
  primary key (workspace_id, conversation_id, access_token_hash);

create index if not exists crm_site_chat_access_thread_idx
  on crm_site_chat_access (workspace_id, conversation_id, expires_at);

create or replace function norauto_enforce_site_chat_access_update_integrity()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is distinct from old.workspace_id
     or new.conversation_id is distinct from old.conversation_id
     or new.access_token_hash is distinct from old.access_token_hash
     or new.issuance_proof is distinct from old.issuance_proof
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'SITE_CHAT_ACCESS_CAPABILITY_IMMUTABLE';
  end if;

  if new.last_seen_at is distinct from old.last_seen_at then
    if new.last_seen_at is null then
      raise exception 'SITE_CHAT_ACCESS_LAST_SEEN_INVALID';
    end if;

    if old.last_seen_at is not null and new.last_seen_at < old.last_seen_at then
      raise exception 'SITE_CHAT_ACCESS_LAST_SEEN_REGRESSION';
    end if;
  end if;

  return new;
end;
$$;

comment on column crm_site_chat_access.access_token_hash is
  'Server-HMAC verifier bound to workspace + conversation + browser token. Raw browser token is never stored.';

comment on column crm_site_chat_access.issuance_proof is
  'Server-HMAC proof authenticating application issuance metadata. Rows without a valid proof carry no read authority.';


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
     and expires_at > clock_timestamp()
   order by expires_at desc
   limit 1
   for update;

  if active_expires_at is null then
    raise exception 'SITE_CHAT_REPLY_THREAD_NOT_ACTIVE';
  end if;

  return new;
end;
$$;

comment on function norauto_enforce_site_chat_reply_access_at_commit() is
  'Deferred commit-time guard compatible with multiple candidate access rows: at least one row must remain unexpired through commit.';
