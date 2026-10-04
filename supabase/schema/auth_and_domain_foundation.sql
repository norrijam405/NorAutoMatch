-- NorAutoMatch / IgniAqua Supabase foundation.
-- Mirrors the DDL applied to project xiqfmaibhhtffrxibiov on 2026-09-15.
-- This file is a source-controlled schema receipt; remote migration history remains canonical for applied state.

create schema if not exists igniaqua;
revoke all on schema igniaqua from public, anon, authenticated;
grant usage on schema igniaqua to service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null check (app_id in ('norautomatch','igniaqua')),
  role text not null default 'member' check (role in ('member','operator','admin','founder')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

create table if not exists public.saved_vehicles (
  user_id uuid not null references auth.users(id) on delete cascade,
  vin text not null check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, vin)
);

create table if not exists public.inventory_vehicles (
  vin text primary key check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  workspace_id text not null,
  dealer_id integer not null,
  provider text not null,
  source_url text not null,
  source_vehicle_id text,
  stock_number text,
  source_stock_status text,
  in_transit boolean,
  year integer,
  make text,
  model text,
  trim text,
  condition text,
  price numeric,
  market_price numeric,
  discount_amount numeric,
  doc_fee numeric,
  service_handling_fee numeric,
  other_dealer_fees numeric,
  displayed_dealer_subtotal numeric,
  msrp numeric,
  mileage integer,
  exterior_color text,
  interior_color text,
  drivetrain text,
  transmission text,
  engine text,
  fuel_type text,
  city_mpg numeric,
  highway_mpg numeric,
  body_type text,
  photos jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  incentives jsonb not null default '[]'::jsonb,
  availability_state text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  fetched_at timestamptz not null,
  source_hash text not null,
  parser_version text not null,
  consecutive_healthy_misses integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists igniaqua.evidence_events (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  event_type text not null,
  subject_ref text,
  truth_state text not null,
  authority_effect text not null default 'NONE',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inventory_vehicles_dealer_state_idx on public.inventory_vehicles (dealer_id, availability_state);
create index if not exists inventory_vehicles_make_model_year_idx on public.inventory_vehicles (make, model, year);
create index if not exists saved_vehicles_user_idx on public.saved_vehicles (user_id);
create index if not exists app_memberships_user_active_idx on public.app_memberships (user_id, active);

alter table public.profiles enable row level security;
alter table public.app_memberships enable row level security;
alter table public.saved_vehicles enable row level security;
alter table public.inventory_vehicles enable row level security;
alter table igniaqua.evidence_events enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.app_memberships from anon, authenticated;
revoke all on table public.saved_vehicles from anon, authenticated;
revoke all on table public.inventory_vehicles from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.app_memberships to authenticated;
grant select, insert, delete on table public.saved_vehicles to authenticated;
grant select on table public.inventory_vehicles to anon, authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "memberships_select_own" on public.app_memberships for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_vehicles_select_own" on public.saved_vehicles for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_vehicles_insert_own" on public.saved_vehicles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saved_vehicles_delete_own" on public.saved_vehicles for delete to authenticated using ((select auth.uid()) = user_id);
create policy "inventory_public_read" on public.inventory_vehicles for select to anon, authenticated using (availability_state in ('ACTIVE_CURRENT','ACTIVE_STALE'));

create or replace function igniaqua.bootstrap_norautomatch_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, display_name) values (new.id, null) on conflict (id) do nothing;
  insert into public.app_memberships (user_id, app_id, role, active)
  values (new.id, 'norautomatch', 'member', true)
  on conflict (user_id, app_id) do nothing;
  return new;
end;
$$;
revoke all on function igniaqua.bootstrap_norautomatch_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_bootstrap_norautomatch on auth.users;
create trigger on_auth_user_created_bootstrap_norautomatch
after insert on auth.users
for each row execute function igniaqua.bootstrap_norautomatch_user();
