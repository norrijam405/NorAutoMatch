create role anon nologin;
create role authenticated nologin;

create schema auth;

create table auth.users (
  id uuid primary key
);

create function auth.uid()
returns uuid
language sql
stable
as 'select null::uuid';

create table public.app_memberships (
  user_id uuid not null,
  app_id text not null,
  active boolean not null default true,
  role text not null
);
