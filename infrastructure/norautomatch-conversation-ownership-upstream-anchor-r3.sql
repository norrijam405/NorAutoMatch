-- NorAutoMatch R2 FRC-45/FRC-47 stable upstream-existence anchor.
-- Current ownership rows must correspond to a durable upstream conversation event.

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
