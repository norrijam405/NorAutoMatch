-- NorAutoMatch V1.1 lot-photo cover integrity guard.
-- A VIN may have at most one active cover photo at a time.

create unique index if not exists vehicle_photo_overrides_one_active_cover_per_vin_idx
  on public.vehicle_photo_overrides (vin)
  where active = true and is_cover = true;
