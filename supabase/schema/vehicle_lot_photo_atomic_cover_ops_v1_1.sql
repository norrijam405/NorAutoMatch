-- NorAutoMatch V1.1 atomic lot-photo cover operations.
-- Keeps cover changes inside one PostgreSQL transaction while preserving
-- the caller's existing RLS authorization through SECURITY INVOKER.

create or replace function public.set_vehicle_photo_cover(
  p_vin text,
  p_photo_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if p_vin is null or p_vin !~ '^[A-HJ-NPR-Z0-9]{17}$' then
    raise exception 'INVALID_VIN';
  end if;

  select v.id
    into target_id
    from public.vehicle_photo_overrides v
   where v.id = p_photo_id
     and v.vin = p_vin
     and v.active = true
   for update;

  if target_id is null then
    raise exception 'ACTIVE_PHOTO_NOT_FOUND';
  end if;

  update public.vehicle_photo_overrides
     set is_cover = false
   where vin = p_vin
     and active = true
     and is_cover = true
     and id <> p_photo_id;

  update public.vehicle_photo_overrides
     set is_cover = true
   where id = p_photo_id
     and vin = p_vin
     and active = true;

  return true;
end;
$$;

create or replace function public.deactivate_vehicle_photo(
  p_vin text,
  p_photo_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_is_cover boolean;
  replacement_id uuid;
begin
  if p_vin is null or p_vin !~ '^[A-HJ-NPR-Z0-9]{17}$' then
    raise exception 'INVALID_VIN';
  end if;

  select v.is_cover
    into target_is_cover
    from public.vehicle_photo_overrides v
   where v.id = p_photo_id
     and v.vin = p_vin
     and v.active = true
   for update;

  if not found then
    return false;
  end if;

  update public.vehicle_photo_overrides
     set active = false,
         is_cover = false
   where id = p_photo_id
     and vin = p_vin
     and active = true;

  if target_is_cover then
    select v.id
      into replacement_id
      from public.vehicle_photo_overrides v
     where v.vin = p_vin
       and v.active = true
     order by v.sort_order asc, v.created_at asc, v.id asc
     limit 1
     for update;

    if replacement_id is not null then
      update public.vehicle_photo_overrides
         set is_cover = true
       where id = replacement_id
         and vin = p_vin
         and active = true;
    end if;
  end if;

  return true;
end;
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Keep these mutation RPCs callable only by signed-in users; table RLS still
-- performs the operator/admin/founder authorization check on every update.
revoke execute on function public.set_vehicle_photo_cover(text, uuid) from public, anon;
revoke execute on function public.deactivate_vehicle_photo(text, uuid) from public, anon;
grant execute on function public.set_vehicle_photo_cover(text, uuid) to authenticated;
grant execute on function public.deactivate_vehicle_photo(text, uuid) to authenticated;
