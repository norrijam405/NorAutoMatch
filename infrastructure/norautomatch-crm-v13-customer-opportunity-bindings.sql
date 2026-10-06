-- NorAutoMatch R2 customer-account to CRM-opportunity binding.
-- This is the only authority allowed to connect authenticated secure-document ownership
-- to an otherwise public-intake CRM opportunity.

create table if not exists crm_opportunity_customer_bindings (
    workspace_id text not null,
    opportunity_id text not null,
    customer_user_id uuid not null,
    evidence_ref text not null check (char_length(btrim(evidence_ref)) between 1 and 512),
    authority text not null check (authority in ('AUTHENTICATED_CUSTOMER','DEALERSHIP_SYSTEM')),
    bound_at timestamptz not null default clock_timestamp(),
    primary key (workspace_id, opportunity_id),
    foreign key (workspace_id, opportunity_id)
      references crm_opportunities (workspace_id, opportunity_id)
      on delete restrict
);

create index if not exists crm_opportunity_customer_bindings_user_idx
  on crm_opportunity_customer_bindings (workspace_id, customer_user_id, bound_at desc);

create or replace function norautomatch_reject_customer_binding_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'NorAutoMatch opportunity customer bindings are immutable evidence';
end;
$$;

drop trigger if exists crm_opportunity_customer_bindings_immutable
  on crm_opportunity_customer_bindings;
create trigger crm_opportunity_customer_bindings_immutable
before update or delete on crm_opportunity_customer_bindings
for each row
execute function norautomatch_reject_customer_binding_mutation();

create or replace function norautomatch_enforce_secure_document_opportunity_binding()
returns trigger
language plpgsql
as $$
begin
  if new.opportunity_id is null then
    return new;
  end if;

  if not exists (
    select 1
      from crm_opportunity_customer_bindings b
     where b.workspace_id = 'norautomatch'
       and b.opportunity_id = new.opportunity_id
       and b.customer_user_id = new.user_id
  ) then
    raise exception 'SECURE_DOCUMENT_OPPORTUNITY_CUSTOMER_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists customer_secure_document_opportunity_binding_guard
  on customer_secure_documents;
create trigger customer_secure_document_opportunity_binding_guard
before insert or update of opportunity_id, user_id on customer_secure_documents
for each row
execute function norautomatch_enforce_secure_document_opportunity_binding();

comment on table crm_opportunity_customer_bindings is
  'Immutable evidence binding an authenticated NorAutoMatch customer account to one CRM opportunity. Secure-document linkage requires an exact user/opportunity match.';
