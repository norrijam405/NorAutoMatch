-- NorAutoMatch R2 FRC-44 stable assignment-event security anchor.
-- This trigger is intentionally separate from the evolving sequencing/concurrency
-- function so startup can verify an exact stable implementation.

create or replace function public.norautomatch_assignment_event_security_anchor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  candidate_secret text;
  current_state text;
  current_assignee text;
begin
  candidate_secret := current_setting(
    'norautomatch.conversation_assignment_hmac_secret',
    true
  );

  if not public.norautomatch_conversation_assignment_secret_trusted(candidate_secret) then
    raise exception 'CONVERSATION_ASSIGNMENT_EVENT_AUTHENTICITY_REQUIRED';
  end if;

  select a.assignment_state, a.assignee_subject_id
    into current_state, current_assignee
    from public.crm_conversation_assignments a
   where a.workspace_id = new.workspace_id
     and a.provider = new.provider
     and a.conversation_id = new.conversation_id;

  if not found then
    raise exception 'CONVERSATION_ASSIGNMENT_EVENT_STATE_REQUIRED';
  end if;

  if new.action='CLAIMED' then
    if new.assignee_subject_id is null
       or new.actor_subject_id is distinct from new.assignee_subject_id
       or current_state is distinct from 'ASSIGNED'
       or current_assignee is distinct from new.assignee_subject_id then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_CLAIM_TRUTH_INVALID';
    end if;
  elsif new.action='RELEASED' then
    if new.assignee_subject_id is not null
       or current_state is distinct from 'UNASSIGNED'
       or current_assignee is not null then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_RELEASE_TRUTH_INVALID';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists crm_conversation_assignment_events_security_anchor
  on public.crm_conversation_assignment_events;
create trigger crm_conversation_assignment_events_security_anchor
before insert on public.crm_conversation_assignment_events
for each row
execute function public.norautomatch_assignment_event_security_anchor();

comment on function public.norautomatch_assignment_event_security_anchor() is
  'FRC-44 stable security anchor: exact-fingerprint verified authentication and assignment-state truth.';
