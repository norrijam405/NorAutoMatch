-- NorAutoMatch R2 FRC-22 repeatable site-chat publication-secret rotation.
-- Rotation is authorized only by proof of knowledge of the currently trusted
-- site-chat publication secret. Arbitrary session values cannot replace the
-- durable trust anchor.

create or replace function public.norauto_reject_site_chat_publication_anchor_mutation()
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
    raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_IMMUTABLE';
  end if;

  if new.anchor_id is distinct from old.anchor_id
     or new.bound_at is distinct from old.bound_at then
    raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_IMMUTABLE';
  end if;

  rotation_current := current_setting(
    'norautomatch.site_chat_rotation_current_secret',
    true
  );
  rotation_previous := current_setting(
    'norautomatch.site_chat_rotation_previous_secret',
    true
  );

  if rotation_current is null or char_length(rotation_current) < 32
     or rotation_previous is null or char_length(rotation_previous) < 32 then
    raise exception 'SITE_CHAT_PUBLICATION_TRUST_ANCHOR_IMMUTABLE';
  end if;

  expected_previous := encode(
    public.digest(rotation_previous, 'sha256'),
    'hex'
  );

  if expected_previous is distinct from old.current_secret_sha256 then
    raise exception 'SITE_CHAT_PUBLICATION_ROTATION_PREVIOUS_SECRET_MISMATCH';
  end if;

  expected_current := encode(
    public.digest(rotation_current, 'sha256'),
    'hex'
  );

  if expected_current = expected_previous then
    raise exception 'SITE_CHAT_PUBLICATION_ROTATION_SECRET_REUSE_FORBIDDEN';
  end if;

  if new.current_secret_sha256 is distinct from expected_current
     or new.previous_secret_sha256 is distinct from old.current_secret_sha256 then
    raise exception 'SITE_CHAT_PUBLICATION_ROTATION_STATE_INVALID';
  end if;

  return new;
end;
$$;

comment on function public.norauto_reject_site_chat_publication_anchor_mutation() is
  'FRC-22 rotation-aware site-chat publication anchor guard. UPDATE requires proof of knowledge of the currently trusted secret; DELETE remains forbidden.';
