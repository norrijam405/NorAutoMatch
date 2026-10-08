-- NorAutoMatch R2 FRC-13 authenticated site-chat publication activation.
-- Publication authority must require an authentic application-issued access row,
-- independently verified again at deferred database commit.

create extension if not exists pgcrypto;

alter table crm_site_chat_access
  add column if not exists publication_proof char(64)
  check (publication_proof is null or publication_proof ~ '^[0-9a-f]{64}$');

create or replace function norauto_enforce_site_chat_access_update_integrity()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is distinct from old.workspace_id
     or new.conversation_id is distinct from old.conversation_id
     or new.access_token_hash is distinct from old.access_token_hash
     or new.issuance_proof is distinct from old.issuance_proof
     or new.publication_proof is distinct from old.publication_proof
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

create or replace function norauto_site_chat_publication_proof_valid(
  p_workspace_id text,
  p_conversation_id text,
  p_access_token_hash text,
  p_publication_proof text,
  p_current_secret text,
  p_previous_secret text
)
returns boolean
language plpgsql
immutable
as $$
declare
  material text;
  expected_current text;
  expected_previous text;
begin
  if p_publication_proof is null or p_publication_proof !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  material :=
    'norautomatch:site-chat-publication:v1'
    || chr(31) || p_workspace_id
    || chr(31) || p_conversation_id
    || chr(31) || p_access_token_hash;

  if p_current_secret is not null and char_length(p_current_secret) >= 32 then
    expected_current := encode(hmac(material, p_current_secret, 'sha256'), 'hex');
    if expected_current = p_publication_proof then
      return true;
    end if;
  end if;

  if p_previous_secret is not null and char_length(p_previous_secret) >= 32 then
    expected_previous := encode(hmac(material, p_previous_secret, 'sha256'), 'hex');
    if expected_previous = p_publication_proof then
      return true;
    end if;
  end if;

  return false;
end;
$$;

create or replace function norauto_enforce_site_chat_reply_access_at_commit()
returns trigger
language plpgsql
as $$
declare
  current_secret text;
  previous_secret text;
  active_expires_at timestamptz;
begin
  current_secret := current_setting('norautomatch.site_chat_publication_hmac_secret', true);
  previous_secret := current_setting('norautomatch.site_chat_publication_previous_hmac_secret', true);

  if current_secret is null or char_length(current_secret) < 32 then
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
       current_secret,
       nullif(previous_secret, '')
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

comment on column crm_site_chat_access.publication_proof is
  'Server-HMAC proof required for representative site-chat publication authority. Direct SQL rows without a valid server proof cannot activate publication.';

comment on function norauto_site_chat_publication_proof_valid(text,text,text,text,text,text) is
  'Validates the publication HMAC bound to workspace + conversation + token verifier using current or previous server secret.';

comment on function norauto_enforce_site_chat_reply_access_at_commit() is
  'Deferred FRC-13 guard: reply commit requires an unexpired access row whose publication proof validates with the transaction-local server HMAC secret.';
