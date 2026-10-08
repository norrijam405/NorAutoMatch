-- NorAutoMatch R2 FRC-14 trusted publication-secret anchor.
-- The production migration runner binds the trusted current/previous server
-- HMAC secret digests in the same transaction that creates this anchor.
-- Runtime sessions may transport candidate secrets through transaction-local
-- GUCs, but those values carry no authority unless their digests match this
-- immutable bootstrap anchor.

create extension if not exists pgcrypto;

create table if not exists crm_site_chat_publication_secret_anchor (
  anchor_id text primary key
    check (anchor_id = 'ACTIVE'),
  current_secret_sha256 char(64) not null
    check (current_secret_sha256 ~ '^[0-9a-f]{64}$'),
  previous_secret_sha256 char(64)
    check (previous_secret_sha256 is null or previous_secret_sha256 ~ '^[0-9a-f]{64}$'),
  bound_at timestamptz not null default current_timestamp
);

do $$
declare
  bootstrap_current text;
  bootstrap_previous text;
  current_digest text;
  previous_digest text;
begin
  bootstrap_current := current_setting(
    'norautomatch.bootstrap_site_chat_publication_hmac_secret',
    true
  );
  bootstrap_previous := nullif(
    current_setting(
      'norautomatch.bootstrap_site_chat_publication_previous_hmac_secret',
      true
    ),
    ''
  );

  if bootstrap_current is null or char_length(bootstrap_current) < 32 then
    raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_SECRET_NOT_CONFIGURED';
  end if;

  if bootstrap_previous is not null and char_length(bootstrap_previous) < 32 then
    raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_PREVIOUS_SECRET_INVALID';
  end if;

  current_digest := encode(digest(bootstrap_current, 'sha256'), 'hex');
  previous_digest := case
    when bootstrap_previous is null then null
    else encode(digest(bootstrap_previous, 'sha256'), 'hex')
  end;

  if previous_digest is not null and previous_digest = current_digest then
    raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_ROTATION_INVALID';
  end if;

  insert into crm_site_chat_publication_secret_anchor (
    anchor_id,
    current_secret_sha256,
    previous_secret_sha256
  ) values (
    'ACTIVE',
    current_digest,
    previous_digest
  );
end;
$$;

create or replace function norauto_reject_site_chat_publication_anchor_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_IMMUTABLE';
end;
$$;

drop trigger if exists crm_site_chat_publication_anchor_immutable
  on crm_site_chat_publication_secret_anchor;
create trigger crm_site_chat_publication_anchor_immutable
before update or delete on crm_site_chat_publication_secret_anchor
for each row
execute function norauto_reject_site_chat_publication_anchor_mutation();

create or replace function norauto_reject_site_chat_publication_anchor_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_CANNOT_BE_TRUNCATED';
end;
$$;

drop trigger if exists crm_site_chat_publication_anchor_no_truncate
  on crm_site_chat_publication_secret_anchor;
create trigger crm_site_chat_publication_anchor_no_truncate
before truncate on crm_site_chat_publication_secret_anchor
for each statement
execute function norauto_reject_site_chat_publication_anchor_truncate();

create or replace function norauto_site_chat_publication_secret_trusted(
  p_secret text
)
returns boolean
language sql
stable
as $$
  select
    p_secret is not null
    and char_length(p_secret) >= 32
    and exists (
      select 1
        from crm_site_chat_publication_secret_anchor a
       where a.anchor_id = 'ACTIVE'
         and encode(digest(p_secret, 'sha256'), 'hex')
             in (
               a.current_secret_sha256,
               coalesce(a.previous_secret_sha256, '')
             )
    )
$$;

create or replace function norauto_enforce_site_chat_reply_access_at_commit()
returns trigger
language plpgsql
as $$
declare
  current_secret text;
  previous_secret text;
  trusted_current text;
  trusted_previous text;
  active_expires_at timestamptz;
begin
  current_secret := current_setting(
    'norautomatch.site_chat_publication_hmac_secret',
    true
  );
  previous_secret := nullif(
    current_setting(
      'norautomatch.site_chat_publication_previous_hmac_secret',
      true
    ),
    ''
  );

  trusted_current := case
    when norauto_site_chat_publication_secret_trusted(current_secret)
      then current_secret
    else null
  end;

  trusted_previous := case
    when norauto_site_chat_publication_secret_trusted(previous_secret)
      then previous_secret
    else null
  end;

  if trusted_current is null and trusted_previous is null then
    raise exception 'SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED';
  end if;

  select a.expires_at
    into active_expires_at
    from crm_site_chat_access a
   where a.workspace_id = new.workspace_id
     and a.conversation_id = new.conversation_id
     and a.expires_at > clock_timestamp()
     and norauto_site_chat_publication_proof_valid(
       a.workspace_id,
       a.conversation_id,
       a.access_token_hash,
       a.publication_proof,
       trusted_current,
       trusted_previous
     )
   order by a.expires_at desc
   limit 1
   for update;

  if active_expires_at is null then
    raise exception 'SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED';
  end if;

  return new;
end;
$$;

comment on table crm_site_chat_publication_secret_anchor is
  'FRC-14 immutable singleton containing only SHA-256 digests of the trusted current/previous publication HMAC secrets, bound during governed production migration.';

comment on function norauto_site_chat_publication_secret_trusted(text) is
  'Returns true only when a session-supplied publication HMAC secret matches the immutable bootstrap trust anchor.';

comment on function norauto_enforce_site_chat_reply_access_at_commit() is
  'Deferred FRC-14 guard: transaction-local publication secrets are accepted only when independently anchored by the governed bootstrap digest.';
