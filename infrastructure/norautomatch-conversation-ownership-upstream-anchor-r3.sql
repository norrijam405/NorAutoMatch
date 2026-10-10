-- NorAutoMatch R2 FRC-45/FRC-47 stable upstream-existence anchor.
-- Authentication remains in the assignment mutation guard. Upstream
-- conversation existence is owned by a separate exact-fingerprint anchor.

create or replace function public.norautomatch_enforce_conversation_assignment_mutation_authenticity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  candidate_secret text;
begin
  candidate_secret := current_setting(
    'norautomatch.conversation_assignment_hmac_secret',
    true
  );

  if not public.norautomatch_conversation_assignment_secret_trusted(candidate_secret) then
    raise exception 'CONVERSATION_ASSIGNMENT_AUTHENTICITY_REQUIRED';
  end if;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.norautomatch_assignment_upstream_security_anchor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
      from public.crm_conversation_events e
     where e.workspace_id = new.workspace_id
       and e.provider = new.provider
       and e.conversation_id = new.conversation_id
  ) then
    raise exception 'CONVERSATION_ASSIGNMENT_UPSTREAM_EVENT_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_conversation_assignments_upstream_anchor
  on public.crm_conversation_assignments;
create trigger crm_conversation_assignments_upstream_anchor
before insert or update on public.crm_conversation_assignments
for each row
execute function public.norautomatch_assignment_upstream_security_anchor();

comment on function public.norautomatch_assignment_upstream_security_anchor() is
  'FRC-45/FRC-47 stable anchor: assignment rows require durable upstream conversation evidence.';
