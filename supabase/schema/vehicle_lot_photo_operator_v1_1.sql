-- NorAutoMatch V1.1 lot-photo operator hardening.
-- Keeps the existing public presentation bucket while making metadata/storage
-- authorization explicit, RLS-bound, and efficient at scale.

create index if not exists vehicle_photo_overrides_uploaded_by_idx
  on public.vehicle_photo_overrides (uploaded_by);

-- The table was created without browser grants, so its existing RLS policies
-- were not reachable through the Data API. Grant only the operations that have
-- explicit RLS policies; raw authorization still comes from app_memberships.
grant select on table public.vehicle_photo_overrides to anon, authenticated;
grant insert, update, delete on table public.vehicle_photo_overrides to authenticated;

-- Replace auth.uid() per-row evaluation with init-plan form.
drop policy if exists "NorAuto operators can add vehicle photo overrides" on public.vehicle_photo_overrides;
create policy "NorAuto operators can add vehicle photo overrides"
on public.vehicle_photo_overrides
for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "NorAuto operators can update vehicle photo overrides" on public.vehicle_photo_overrides;
create policy "NorAuto operators can update vehicle photo overrides"
on public.vehicle_photo_overrides
for update
to authenticated
using (
  exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
)
with check (
  exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "NorAuto operators can delete vehicle photo overrides" on public.vehicle_photo_overrides;
create policy "NorAuto operators can delete vehicle photo overrides"
on public.vehicle_photo_overrides
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

-- Preserve the existing customer presentation rule.
drop policy if exists "Public can read active vehicle photo overrides" on public.vehicle_photo_overrides;
create policy "Public can read active vehicle photo overrides"
on public.vehicle_photo_overrides
for select
to anon, authenticated
using (active = true);

-- Storage policies use the same membership boundary and init-plan auth lookup.
drop policy if exists "NorAuto operators can upload lot photos" on storage.objects;
create policy "NorAuto operators can upload lot photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vehicle-lot-photos'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "NorAuto operators can update lot photos" on storage.objects;
create policy "NorAuto operators can update lot photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vehicle-lot-photos'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
)
with check (
  bucket_id = 'vehicle-lot-photos'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "NorAuto operators can delete lot photos" on storage.objects;
create policy "NorAuto operators can delete lot photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vehicle-lot-photos'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);
