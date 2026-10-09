-- NorAutoMatch R2 FRC-16 authenticated customer/opportunity binding issuance.
-- Direct SQL must not mint AUTHENTICATED_CUSTOMER or DEALERSHIP_SYSTEM binding authority.
-- The production migration runner binds a domain-separated digest of the governed
-- server root secret. Runtime issuance must present the matching secret through a
-- transaction-local GUC; arbitrary direct-SQL values carry no authority.

create extension if not exists pgcrypto;

create table if not exists crm_customer_binding_secret_anchor (
  anchor_id text primary key
    check (anchor_id = 'ACTIVE'),
  binding_secret_sha256 char(64) not null
    check (binding_secret_sha256 ~ '^[0-9a-f]{64}$'),
  bound_at timestamptz not null default current_timestamp
);

do $$
declare
  bootstrap_secret text;
  domain_digest text;
begin
  bootstrap_secret := current_setting(
    'norautomatch.bootstrap_customer_binding_hmac_secret',
    true
  );

  if bootstrap_secret is null or char_length(bootstrap_secret) < 32 then
    raise exception 'CUSTOMER_BINDING_TRUST_ANCHOR_SECRET_NOT_CONFIGURED';
  end if;

  domain_digest := encode(
    digest(
      'norautomatch:customer-binding:v1' || chr(31) || bootstrap_secret,
      'sha256'
    ),
    'hex'
  );

  insert into crm_customer_binding_secret_anchor (
    anchor_id,
    binding_secret_sha256
  ) values (
    'ACTIVE',
    domain_digest
  );
end;
$$;

create or replace function public.norautomatch_reject_customer_binding_anchor_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'CUSTOMER_BINDING_TRUST_ANCHOR_IMMUTABLE';
end;
$$;

drop trigger if exists crm_customer_binding_anchor_immutable
  on crm_customer_binding_secret_anchor;
create trigger crm_customer_binding_anchor_immutable
before update or delete on crm_customer_binding_secret_anchor
for each row
execute function public.norautomatch_reject_customer_binding_anchor_mutation();

create or replace function public.norautomatch_reject_customer_binding_anchor_truncate()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'CUSTOMER_BINDING_TRUST_ANCHOR_CANNOT_BE_TRUNCATED';
end;
$$;

drop trigger if exists crm_customer_binding_anchor_no_truncate
  on crm_customer_binding_secret_anchor;
create trigger crm_customer_binding_anchor_no_truncate
before truncate on crm_customer_binding_secret_anchor
for each statement
execute function public.norautomatch_reject_customer_binding_anchor_truncate();

create or replace function public.norautomatch_customer_binding_secret_trusted(
  p_secret text
)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    p_secret is not null
    and char_length(p_secret) >= 32
    and exists (
      select 1
        from public.crm_customer_binding_secret_anchor a
       where a.anchor_id = 'ACTIVE'
         and encode(
               public.digest(
                 'norautomatch:customer-binding:v1' || chr(31) || p_secret,
                 'sha256'
               ),
               'hex'
             ) = a.binding_secret_sha256
    )
$$;

create or replace function public.norautomatch_enforce_customer_binding_insert_authenticity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  candidate_secret text;
begin
  candidate_secret := current_setting(
    'norautomatch.customer_binding_hmac_secret',
    true
  );

  if not public.norautomatch_customer_binding_secret_trusted(candidate_secret) then
    raise exception 'CUSTOMER_OPPORTUNITY_BINDING_AUTHENTICITY_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists crm_opportunity_customer_bindings_insert_authenticity
  on crm_opportunity_customer_bindings;
create trigger crm_opportunity_customer_bindings_insert_authenticity
before insert on crm_opportunity_customer_bindings
for each row
execute function public.norautomatch_enforce_customer_binding_insert_authenticity();

comment on table crm_customer_binding_secret_anchor is
  'FRC-16 immutable singleton holding a domain-separated digest of the governed server root secret used only to authenticate customer/opportunity binding issuance.';

comment on function public.norautomatch_enforce_customer_binding_insert_authenticity() is
  'FRC-16 insert guard: customer/opportunity binding authority may be minted only by a server session presenting the governed secret; arbitrary direct SQL fails closed.';
