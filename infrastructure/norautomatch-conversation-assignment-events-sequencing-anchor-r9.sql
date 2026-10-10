-- NorAutoMatch R2 FRC-48 stable assignment-event sequencing anchor.
-- Enforce durable transition order independently of the evolving event guard.

create or replace function public.norautomatch_assignment_event_sequencing_anchor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  previous_action text;
  previous_actor text;
  previous_assignee text;
begin
  select e.action, e.actor_subject_id, e.assignee_subject_id
    into previous_action, previous_actor, previous_assignee
    from public.crm_conversation_assignment_events e
   where e.workspace_id = new.workspace_id
     and e.provider = new.provider
     and e.conversation_id = new.conversation_id
   order by e.id desc
   limit 1;

  if new.action='CLAIMED' then
    if previous_action is not null and previous_action is distinct from 'RELEASED' then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_CLAIM_SEQUENCE_INVALID';
    end if;
  elsif new.action='RELEASED' then
    if previous_action is distinct from 'CLAIMED'
       or previous_actor is distinct from new.actor_subject_id
       or previous_assignee is distinct from new.actor_subject_id then
      raise exception 'CONVERSATION_ASSIGNMENT_EVENT_RELEASE_SEQUENCE_INVALID';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists crm_conversation_assignment_events_10_sequencing_anchor
  on public.crm_conversation_assignment_events;
create trigger crm_conversation_assignment_events_10_sequencing_anchor
before insert on public.crm_conversation_assignment_events
for each row
execute function public.norautomatch_assignment_event_sequencing_anchor();

comment on function public.norautomatch_assignment_event_sequencing_anchor() is
  'FRC-48 stable anchor: assignment evidence must follow CLAIMED/RELEASED transition order.';
