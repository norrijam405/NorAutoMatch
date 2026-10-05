-- NorAutoMatch R2 video hub library.
-- Canonical metadata only. No automatic social publishing authority.

create table if not exists public.video_hub_entries (
  id uuid primary key,
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 1000),
  canonical_url text not null,
  visibility text not null check (visibility in ('DRAFT','PUBLIC','UNLISTED')),
  vehicle_vins text[] not null default '{}',
  topics text[] not null default '{}',
  channels jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_hub_entry_vins_limit check (cardinality(vehicle_vins) <= 50),
  constraint video_hub_entry_topics_limit check (cardinality(topics) <= 25),
  constraint video_hub_entry_channels_array check (jsonb_typeof(channels) = 'array')
);

create index if not exists video_hub_entries_visibility_created_idx
  on public.video_hub_entries (visibility, created_at desc);

create index if not exists video_hub_entries_topics_gin_idx
  on public.video_hub_entries using gin (topics);

create index if not exists video_hub_entries_vins_gin_idx
  on public.video_hub_entries using gin (vehicle_vins);

alter table public.video_hub_entries enable row level security;

revoke all on table public.video_hub_entries from anon, authenticated;
grant select on table public.video_hub_entries to anon, authenticated;
grant insert, update, delete on table public.video_hub_entries to authenticated;

drop policy if exists "video_hub_public_read" on public.video_hub_entries;
create policy "video_hub_public_read"
on public.video_hub_entries
for select
to anon, authenticated
using (
  visibility = 'PUBLIC'
  or exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "video_hub_operator_insert" on public.video_hub_entries;
create policy "video_hub_operator_insert"
on public.video_hub_entries
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "video_hub_operator_update" on public.video_hub_entries;
create policy "video_hub_operator_update"
on public.video_hub_entries
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

drop policy if exists "video_hub_operator_delete" on public.video_hub_entries;
create policy "video_hub_operator_delete"
on public.video_hub_entries
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

create or replace function public.norautomatch_touch_video_hub_entry_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

revoke all on function public.norautomatch_touch_video_hub_entry_updated_at()
  from public, anon, authenticated;

drop trigger if exists video_hub_entries_touch_updated_at on public.video_hub_entries;
create trigger video_hub_entries_touch_updated_at
before update on public.video_hub_entries
for each row
execute function public.norautomatch_touch_video_hub_entry_updated_at();

comment on table public.video_hub_entries is
  'Canonical NorAutoMatch video metadata and evidence-backed external publication links. No social publishing authority is implied.';
