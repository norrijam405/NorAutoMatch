-- NorAutoMatch R2 FRC-23 current-only customer-binding issuance.
-- The previous secret may authorize governed anchor rotation, but it must not
-- mint brand-new customer/opportunity binding authority after rotation.

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

comment on function public.norautomatch_customer_binding_secret_trusted(text) is
  'FRC-23 issuance trust is current-secret-only. Previous-secret proof remains usable only by the separate governed rotation guard.';
