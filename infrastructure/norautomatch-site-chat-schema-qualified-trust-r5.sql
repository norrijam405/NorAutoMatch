-- NorAutoMatch R2 FRC-15 schema-qualified publication trust chain.
-- Caller-controlled temporary schemas must never substitute for authoritative
-- production relations used by publication authentication.

create or replace function public.norauto_site_chat_publication_secret_trusted(
  p_secret text
)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    p_secret is not null
    and char_length(p_secret) >= 32
    and exists (
      select 1
        from public.crm_site_chat_publication_secret_anchor a
       where a.anchor_id = 'ACTIVE'
         and encode(public.digest(p_secret, 'sha256'), 'hex')
             in (
               a.current_secret_sha256,
               coalesce(a.previous_secret_sha256, '')
             )
    )
$$;

create or replace function public.norauto_enforce_site_chat_reply_access_at_commit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
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
    when public.norauto_site_chat_publication_secret_trusted(current_secret)
      then current_secret
    else null
  end;

  trusted_previous := case
    when public.norauto_site_chat_publication_secret_trusted(previous_secret)
      then previous_secret
    else null
  end;

  if trusted_current is null and trusted_previous is null then
    raise exception 'SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED';
  end if;

  select a.expires_at
    into active_expires_at
    from public.crm_site_chat_access a
   where a.workspace_id = new.workspace_id
     and a.conversation_id = new.conversation_id
     and a.expires_at > clock_timestamp()
     and public.norauto_site_chat_publication_proof_valid(
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

comment on function public.norauto_site_chat_publication_secret_trusted(text) is
  'FRC-15 trust check uses schema-qualified public anchor relation and fixed function search_path so pg_temp relation shadows carry no authority.';

comment on function public.norauto_enforce_site_chat_reply_access_at_commit() is
  'Deferred FRC-15 guard resolves authoritative site-chat access and trust-anchor functions through explicit public schema references.';
