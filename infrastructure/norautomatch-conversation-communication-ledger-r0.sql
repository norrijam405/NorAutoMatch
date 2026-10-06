-- NorAutoMatch R2 rep/customer communication execution ledger.
-- Append-only evidence only. No automatic outbound provider authority and no CRM stage mutation.

create table if not exists crm_conversation_contact_events (
  communication_event_id uuid primary key default gen_random_uuid(),
  client_action_id uuid not null,
  workspace_id text not null,
  provider text not null,
  conversation_id text not null,
  source_event_id text not null,
  channel text not null check (channel in ('EMAIL','TEXT','PHONE')),
  event_type text not null check (event_type in (
    'CHANNEL_HANDOFF_OPENED',
    'OUTBOUND_EXECUTION_RECORDED',
    'DELIVERY_EVIDENCE_RECORDED'
  )),
  actor_subject_id text not null,
  target_hash char(64) not null check (target_hash ~ '^[0-9a-f]{64}$'),
  target_hint text not null,
  evidence_authority text not null check (evidence_authority in (
    'INTERNAL_UI',
    'HUMAN_REP',
    'PROVIDER_RECEIPT_REPORTED_BY_REP'
  )),
  evidence_ref text null,
  delivery_outcome text null check (delivery_outcome is null or delivery_outcome in ('DELIVERED','FAILED')),
  created_at timestamptz not null default current_timestamp,
  unique (workspace_id, client_action_id),
  constraint crm_conversation_contact_event_truth check (
    (event_type='CHANNEL_HANDOFF_OPENED'
      and evidence_authority='INTERNAL_UI'
      and evidence_ref is null
      and delivery_outcome is null)
    or
    (event_type='OUTBOUND_EXECUTION_RECORDED'
      and evidence_authority='HUMAN_REP'
      and evidence_ref is not null
      and delivery_outcome is null)
    or
    (event_type='DELIVERY_EVIDENCE_RECORDED'
      and evidence_authority='PROVIDER_RECEIPT_REPORTED_BY_REP'
      and evidence_ref is not null
      and delivery_outcome is not null
      and channel in ('EMAIL','TEXT'))
  )
);

create index if not exists crm_conversation_contact_events_thread_idx
  on crm_conversation_contact_events (workspace_id, provider, conversation_id, created_at, communication_event_id);

comment on table crm_conversation_contact_events is
  'Append-only rep/customer communication evidence. Opening an external app is not a send. Rep-recorded execution is not delivery. Delivery evidence requires a separate provider-receipt reference and never implies the customer was reached.';


create or replace function norautomatch_reject_communication_evidence_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'NorAutoMatch communication evidence rows are append-only';
end;
$$;

drop trigger if exists crm_conversation_contact_events_immutable
  on crm_conversation_contact_events;
create trigger crm_conversation_contact_events_immutable
before update or delete on crm_conversation_contact_events
for each row
execute function norautomatch_reject_communication_evidence_mutation();


create or replace function norautomatch_reject_communication_evidence_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'NorAutoMatch communication evidence ledger cannot be truncated';
end;
$$;

drop trigger if exists crm_conversation_contact_events_no_truncate
  on crm_conversation_contact_events;
create trigger crm_conversation_contact_events_no_truncate
before truncate on crm_conversation_contact_events
for each statement
execute function norautomatch_reject_communication_evidence_truncate();
