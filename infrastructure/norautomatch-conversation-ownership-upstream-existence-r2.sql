-- NorAutoMatch R2 FRC-41 upstream conversation existence binding.
-- Governed assignment mutation authority must not create ownership for a
-- conversation that has no durable upstream conversation event.

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

  if tg_op <> 'DELETE' and not exists (
    select 1
      from public.crm_conversation_events e
     where e.workspace_id = new.workspace_id
       and e.provider = new.provider
       and e.conversation_id = new.conversation_id
  ) then
    raise exception 'CONVERSATION_ASSIGNMENT_UPSTREAM_EVENT_REQUIRED';
  end if;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.norautomatch_enforce_conversation_assignment_mutation_authenticity() is
  'FRC-41 guard: governed conversation ownership mutation also requires an upstream durable conversation event.';
