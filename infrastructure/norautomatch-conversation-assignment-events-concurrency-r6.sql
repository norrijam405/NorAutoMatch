-- NorAutoMatch R2 FRC-43 serialized assignment-event transitions.
-- Concurrent evidence appends for the same conversation must evaluate
-- transition truth against a committed predecessor.

create or replace function public.norautomatch_enforce_assignment_event_insert_authenticity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  candidate_secret text;
  current_state text;
  current_assignee text;
  previous_action text;
  previous_actor text;
  previous_assignee text;
begin
  candidate_secret := current_setting(
    'norautomatch.conversation_assignment_hmac_secret',
    true
  );

  if not public.norautomatch_conversation_assignment_secret_trusted(candidate_secret) then
    raise exception 'CONVERSATION_ASSIGNMENT_EVENT_AUTHENTICITY_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.workspace_id || chr(31) || new.provider || chr(31) || new.conversation_id,
      0
    )
  );

  select a.assignment_state, a.assignee_subject_id
    into current_state, current_assignee
    from public.crm_conversation_assignments a
   where a.workspace_id = new.workspace_id
     and a.provider = new.provider
     and a.conversation_id = new.conversation_id
   for share;

  if not found then
    raise exception 'CONVERSATION_ASSIGNMENT_EVENT_STATE_REQUIRED';
  end if;

  select e.action, e.actor_subject_id, e.assignee_subject_id
    into previous_action, previous_actor, previous_assignee
    from public.crm_conversation_assignment_events e
   where e.workspace_id = new.workspace_id
     and e.provider = new.provider
     and e.conversation_id = new.conversation_id
   order by e.id desc
   limit 1;

  if new.action='CLAIMED' then
    if new.assignee_subject_id is null
       or new.actor_subject_id is distinct from new.assignee_subject_id
       or current_state is distinct from 'ASSIGNED'
       or current_assignee is distinct from new.assignee_subject_id
       or previous_action is not null and previous_action is distinct from 'RELEASED' then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_CLAIM_TRUTH_INVALID';
    end if;
  elsif new.action='RELEASED' then
    if new.assignee_subject_id is not null
       or current_state is distinct from 'UNASSIGNED'
       or current_assignee is not null
       or previous_action is distinct from 'CLAIMED'
       or previous_actor is distinct from new.actor_subject_id
       or previous_assignee is distinct from new.actor_subject_id then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_RELEASE_TRUTH_INVALID';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.norautomatch_enforce_assignment_event_insert_authenticity() is
  'FRC-43 guard: assignment-event transitions are serialized per conversation before predecessor truth is evaluated.';
