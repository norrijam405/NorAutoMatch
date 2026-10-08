-- NorAutoMatch R2 FRC-11 site-chat access capability integrity.
-- Preserve legitimate read activity while preventing post-issuance capability takeover.

create or replace function norauto_enforce_site_chat_access_update_integrity()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is distinct from old.workspace_id
     or new.conversation_id is distinct from old.conversation_id
     or new.access_token_hash is distinct from old.access_token_hash
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

drop trigger if exists crm_site_chat_access_update_integrity
  on crm_site_chat_access;
create trigger crm_site_chat_access_update_integrity
before update on crm_site_chat_access
for each row
execute function norauto_enforce_site_chat_access_update_integrity();

create or replace function norauto_reject_site_chat_access_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SITE_CHAT_ACCESS_CAPABILITY_DELETE_FORBIDDEN';
end;
$$;

drop trigger if exists crm_site_chat_access_no_delete
  on crm_site_chat_access;
create trigger crm_site_chat_access_no_delete
before delete on crm_site_chat_access
for each row
execute function norauto_reject_site_chat_access_delete();

create or replace function norauto_reject_site_chat_access_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SITE_CHAT_ACCESS_LEDGER_CANNOT_BE_TRUNCATED';
end;
$$;

drop trigger if exists crm_site_chat_access_no_truncate
  on crm_site_chat_access;
create trigger crm_site_chat_access_no_truncate
before truncate on crm_site_chat_access
for each statement
execute function norauto_reject_site_chat_access_truncate();

comment on function norauto_enforce_site_chat_access_update_integrity() is
  'FRC-11 guard: access capability identity, hash, issuance time, and expiry are immutable after issuance. Only monotonic last_seen_at activity may change.';

comment on function norauto_reject_site_chat_access_delete() is
  'FRC-11 guard: direct deletion cannot silently replace a legitimate browser capability. Existing rows expire fail-closed.';

comment on function norauto_reject_site_chat_access_truncate() is
  'FRC-11 guard: site-chat access capability rows cannot be truncated.';
