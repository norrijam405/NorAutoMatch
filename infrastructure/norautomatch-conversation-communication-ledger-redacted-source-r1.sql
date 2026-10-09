-- NorAutoMatch R2 FRC-21 communication lifecycle eligibility hardening.
-- A REDACTED conversation source carries no authority to mint new communication evidence.

create or replace function public.norautomatch_enforce_communication_evidence_insert_truth()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  source_payload jsonb;
  source_processing_state text;
  current_assignment_state text;
  current_assignee text;
begin
  select normalized_payload, processing_state
    into source_payload, source_processing_state
    from public.crm_conversation_events
   where workspace_id = new.workspace_id
     and provider = new.provider
     and event_id = new.source_event_id
     and conversation_id = new.conversation_id
   limit 1;

  if source_payload is null
     or source_processing_state in ('DEAD_LETTER','REDACTED') then
    raise exception 'COMMUNICATION_SOURCE_EVENT_NOT_ELIGIBLE';
  end if;

  select a.assignment_state, a.assignee_subject_id
    into current_assignment_state, current_assignee
    from public.crm_conversation_assignments a
   where workspace_id = new.workspace_id
     and provider = new.provider
     and conversation_id = new.conversation_id
   limit 1;

  if current_assignment_state is distinct from 'ASSIGNED'
     or current_assignee is distinct from new.actor_subject_id then
    raise exception 'COMMUNICATION_CONVERSATION_OWNERSHIP_REQUIRED';
  end if;

  if coalesce((source_payload #>> '{customer,communicationConsent}')::boolean, false) is not true then
    raise exception 'COMMUNICATION_CONSENT_REQUIRED';
  end if;

  if source_payload #>> '{customer,preferredContact}' is distinct from new.channel then
    raise exception 'PREFERRED_CONTACT_MISMATCH';
  end if;

  if new.event_type = 'DELIVERY_EVIDENCE_RECORDED' then
    raise exception 'COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED';
  end if;

  return new;
end;
$$;

comment on function public.norautomatch_enforce_communication_evidence_insert_truth() is
  'FRC-21 communication insert truth: source event must exist, remain lifecycle-eligible (not DEAD_LETTER or REDACTED), preserve current ownership/consent/channel truth, and cannot self-assert provider delivery evidence.';
