-- NorAutoMatch R2 FRC-22 repeatable customer-binding secret rotation.
-- Rotation is authorized only by proof of knowledge of the currently trusted
-- secret. Arbitrary session GUCs without the previous secret cannot rotate
-- the anchor.

alter table public.crm_customer_binding_secret_anchor
  add column if not exists previous_secret_sha256 char(64)
  check (previous_secret_sha256 is null or previous_secret_sha256 ~ '^[0-9a-f]{64}$');

create or replace function public.norautomatch_reject_customer_binding_anchor_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  rotation_current text;
  rotation_previous text;
  expected_current char(64);
  expected_previous char(64);
begin
  if tg_op = 'DELETE' then
    raise exception 'CUSTOMER_BINDING_TRUST_ANCHOR_IMMUTABLE';
  end if;

  if new.anchor_id is distinct from old.anchor_id
     or new.bound_at is distinct from old.bound_at then
    raise exception 'CUSTOMER_BINDING_TRUST_ANCHOR_IMMUTABLE';
  end if;

  rotation_current := current_setting(
    'norautomatch.customer_binding_rotation_current_secret',
    true
  );
  rotation_previous := current_setting(
    'norautomatch.customer_binding_rotation_previous_secret',
    true
  );

  if rotation_current is null or char_length(rotation_current) < 32
     or rotation_previous is null or char_length(rotation_previous) < 32 then
    raise exception 'CUSTOMER_BINDING_TRUST_ANCHOR_IMMUTABLE';
  end if;

  expected_previous := encode(
    public.digest(
      'norautomatch:customer-binding:v1' || chr(31) || rotation_previous,
      'sha256'
    ),
    'hex'
  );
  if expected_previous is distinct from old.binding_secret_sha256 then
    raise exception 'CUSTOMER_BINDING_ROTATION_PREVIOUS_SECRET_MISMATCH';
  end if;

  expected_current := encode(
    public.digest(
      'norautomatch:customer-binding:v1' || chr(31) || rotation_current,
      'sha256'
    ),
    'hex'
  );
  if expected_current = expected_previous then
    raise exception 'CUSTOMER_BINDING_ROTATION_SECRET_REUSE_FORBIDDEN';
  end if;

  if new.binding_secret_sha256 is distinct from expected_current
     or new.previous_secret_sha256 is distinct from old.binding_secret_sha256 then
    raise exception 'CUSTOMER_BINDING_ROTATION_STATE_INVALID';
  end if;

  return new;
end;
$$;

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
             ) in (
               a.binding_secret_sha256,
               coalesce(a.previous_secret_sha256, '')
             )
    )
$$;

comment on column public.crm_customer_binding_secret_anchor.previous_secret_sha256 is
  'FRC-22 previous trusted customer-binding secret digest retained only for governed rotation grace.';

comment on function public.norautomatch_reject_customer_binding_anchor_mutation() is
  'FRC-22 rotation-aware anchor guard. UPDATE requires proof of knowledge of the currently trusted secret; DELETE remains forbidden.';
