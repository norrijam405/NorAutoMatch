-- NorAutoMatch R2 FRC-46 stable assignment-event concurrency anchor.
-- Serialize all assignment-event inserts for one conversation before any
-- transition guard evaluates predecessor evidence.

create or replace function public.norautomatch_assignment_event_concurrency_anchor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.workspace_id || chr(31) || new.provider || chr(31) || new.conversation_id,
      0
    )
  );
  return new;
end;
$$;

drop trigger if exists crm_conversation_assignment_events_00_concurrency_anchor
  on public.crm_conversation_assignment_events;
create trigger crm_conversation_assignment_events_00_concurrency_anchor
before insert on public.crm_conversation_assignment_events
for each row
execute function public.norautomatch_assignment_event_concurrency_anchor();

comment on function public.norautomatch_assignment_event_concurrency_anchor() is
  'FRC-46 stable anchor: serialize assignment-event inserts per conversation.';
