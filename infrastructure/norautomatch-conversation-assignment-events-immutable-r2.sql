-- NorAutoMatch R2 FRC-31 immutable conversation-assignment evidence.
-- Assignment event rows are durable append-only evidence.

create or replace function public.norautomatch_reject_assignment_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'CONVERSATION_ASSIGNMENT_EVENT_IMMUTABLE';
end;
$$;

drop trigger if exists crm_conversation_assignment_events_immutable
  on public.crm_conversation_assignment_events;
create trigger crm_conversation_assignment_events_immutable
before update or delete on public.crm_conversation_assignment_events
for each row
execute function public.norautomatch_reject_assignment_event_mutation();

create or replace function public.norautomatch_reject_assignment_event_truncate()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'CONVERSATION_ASSIGNMENT_EVENT_TRUNCATE_FORBIDDEN';
end;
$$;

drop trigger if exists crm_conversation_assignment_events_no_truncate
  on public.crm_conversation_assignment_events;
create trigger crm_conversation_assignment_events_no_truncate
before truncate on public.crm_conversation_assignment_events
for each statement
execute function public.norautomatch_reject_assignment_event_truncate();

comment on table public.crm_conversation_assignment_events is
  'Append-only durable evidence of governed conversation claim/release actions. UPDATE, DELETE, and TRUNCATE are forbidden.';
