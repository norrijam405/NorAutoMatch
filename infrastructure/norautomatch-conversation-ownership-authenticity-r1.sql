-- NorAutoMatch R2 FRC-25 authenticated conversation-assignment mutation.
-- Direct SQL must not rewrite current conversation ownership and thereby mint
-- downstream communication authority.

create extension if not exists pgcrypto;

create or replace function public.norautomatch_conversation_assignment_secret_trusted(
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
       where a.anchor_id='ACTIVE'
         and encode(
               public.digest(
                 'norautomatch:customer-binding:v1' || chr(31) || p_secret,
                 'sha256'
               ),
               'hex'
             ) = a.binding_secret_sha256
    )
$$;

create or replace function public.norautomatch_enforce_conversation_assignment_mutation_authenticity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  candidate_secret text;
begin
  candidate_secret := current_setting(
    'norautomatch.conversation_assignment_hmac_secret',
    true
  );

  if not public.norautomatch_conversation_assignment_secret_trusted(candidate_secret) then
    raise exception 'CONVERSATION_ASSIGNMENT_AUTHENTICITY_REQUIRED';
  end if;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists crm_conversation_assignments_mutation_authenticity
  on public.crm_conversation_assignments;
create trigger crm_conversation_assignments_mutation_authenticity
before insert or update or delete on public.crm_conversation_assignments
for each row
execute function public.norautomatch_enforce_conversation_assignment_mutation_authenticity();

comment on function public.norautomatch_enforce_conversation_assignment_mutation_authenticity() is
  'FRC-25 guard: current conversation ownership may change only in a server session presenting the governed current root secret.';
