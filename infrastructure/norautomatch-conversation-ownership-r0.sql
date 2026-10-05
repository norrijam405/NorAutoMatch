-- NorAutoMatch R2 conversation ownership.
-- Current assignment + append-only assignment evidence. No CRM terminal-state authority.

create table if not exists crm_conversation_assignments (
  workspace_id text not null,
  provider text not null,
  conversation_id text not null,
  assignee_subject_id text null,
  assignment_state text not null default 'UNASSIGNED'
    check (assignment_state in ('UNASSIGNED','ASSIGNED')),
  assigned_at timestamptz null,
  updated_at timestamptz not null default current_timestamp,
  primary key (workspace_id, provider, conversation_id),
  constraint crm_conversation_assignment_truth check (
    (assignment_state='UNASSIGNED' and assignee_subject_id is null and assigned_at is null)
    or
    (assignment_state='ASSIGNED' and assignee_subject_id is not null and assigned_at is not null)
  )
);

create index if not exists crm_conversation_assignments_assignee_idx
  on crm_conversation_assignments (workspace_id, assignee_subject_id, updated_at desc)
  where assignment_state='ASSIGNED';

create table if not exists crm_conversation_assignment_events (
  id bigserial primary key,
  workspace_id text not null,
  provider text not null,
  conversation_id text not null,
  action text not null check (action in ('CLAIMED','RELEASED')),
  actor_subject_id text not null,
  assignee_subject_id text null,
  created_at timestamptz not null default current_timestamp
);

create index if not exists crm_conversation_assignment_events_thread_idx
  on crm_conversation_assignment_events (workspace_id, provider, conversation_id, created_at desc);

comment on table crm_conversation_assignments is
  'Current human ownership for a conversation-response obligation. Assignment does not imply response, appointment, sale, reservation, financing, SOLD, or LOST.';
comment on table crm_conversation_assignment_events is
  'Append-only evidence of self-claim/self-release actions.';
