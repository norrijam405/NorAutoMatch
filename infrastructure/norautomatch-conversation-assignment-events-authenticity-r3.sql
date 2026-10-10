-- NorAutoMatch R2 FRC-32 authenticated conversation-assignment evidence insertion.
-- Direct SQL must not forge CLAIMED/RELEASED evidence.

create or replace function public.norautomatch_enforce_assignment_event_insert_authenticity()
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
    raise exception 'CONVERSATION_ASSIGNMENT_EVENT_AUTHENTICITY_REQUIRED';
  end if;

  if new.action='CLAIMED' then
    if new.assignee_subject_id is null
       or new.actor_subject_id is distinct from new.assignee_subject_id then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_CLAIM_TRUTH_INVALID';
    end if;
  elsif new.action='RELEASED' then
    if new.assignee_subject_id is not null then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_RELEASE_TRUTH_INVALID';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists crm_conversation_assignment_events_insert_authenticity
  on public.crm_conversation_assignment_events;
create trigger crm_conversation_assignment_events_insert_authenticity
before insert on public.crm_conversation_assignment_events
for each row
execute function public.norautomatch_enforce_assignment_event_insert_authenticity();

comment on function public.norautomatch_enforce_assignment_event_insert_authenticity() is
  'FRC-32 assignment-event insert guard. Only a governed assignment transaction can append claim/release evidence.';
