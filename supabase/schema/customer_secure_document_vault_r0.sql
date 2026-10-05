-- NorAutoMatch R2 secure customer document vault foundation.
-- Private customer uploads only. No lender submission or AI raw-document access.

create table if not exists public.customer_secure_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  opportunity_id text null,
  kind text not null check (kind in (
    'TRADE_OFFER','DRIVER_LICENSE','INSURANCE','PAYOFF_STATEMENT',
    'PROOF_OF_RESIDENCE','DEAL_STIPULATION','OTHER'
  )),
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 12582912),
  sha256 char(64) not null check (sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'UPLOAD_PENDING'
    check (status in ('UPLOAD_PENDING','RECEIVED','REVIEW_REQUIRED','ACCEPTED','REJECTED','EXPIRED')),
  retention_state text not null default 'POLICY_PENDING'
    check (retention_state in ('POLICY_PENDING','ACTIVE','DELETE_DUE','PRESERVED')),
  delete_after timestamptz null,
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_secure_documents_opportunity_format
    check (opportunity_id is null or opportunity_id ~ '^namo_[0-9a-f]{24}$'),
  constraint customer_secure_documents_review_consistency check (
    (reviewed_at is null and reviewed_by is null)
    or (reviewed_at is not null and reviewed_by is not null)
  )
);

create index if not exists customer_secure_documents_user_received_idx
  on public.customer_secure_documents (user_id, received_at desc);

create index if not exists customer_secure_documents_opportunity_idx
  on public.customer_secure_documents (opportunity_id, received_at desc)
  where opportunity_id is not null;

create index if not exists customer_secure_documents_retention_idx
  on public.customer_secure_documents (retention_state, delete_after)
  where delete_after is not null;
create index if not exists customer_secure_documents_reviewed_by_idx
  on public.customer_secure_documents (reviewed_by)
  where reviewed_by is not null;

create table if not exists public.customer_secure_document_access_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.customer_secure_documents(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (
    action in ('MANAGER_VIEW_LINK_CREATED','CUSTOMER_VIEW_LINK_CREATED','MANAGER_METADATA_REVIEWED')
  ),
  created_at timestamptz not null default now()
);

create index if not exists customer_secure_document_access_doc_idx
  on public.customer_secure_document_access_events (document_id, created_at desc);
create index if not exists customer_secure_document_access_actor_idx
  on public.customer_secure_document_access_events (actor_user_id, created_at desc);

alter table public.customer_secure_documents enable row level security;
alter table public.customer_secure_document_access_events enable row level security;

revoke all on table public.customer_secure_documents from anon, authenticated;
revoke all on table public.customer_secure_document_access_events from anon, authenticated;

grant select, update on table public.customer_secure_documents to authenticated;
grant select, insert on table public.customer_secure_document_access_events to authenticated;

drop policy if exists "customer_secure_documents_select_own" on public.customer_secure_documents;
create policy "customer_secure_documents_select_own"
on public.customer_secure_documents
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Customer inserts/deletes are mediated by bounded SECURITY DEFINER functions.
drop policy if exists "customer_secure_documents_operator_select" on public.customer_secure_documents;
create policy "customer_secure_documents_operator_select"
on public.customer_secure_documents
for select
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

drop policy if exists "customer_secure_documents_operator_update" on public.customer_secure_documents;
create policy "customer_secure_documents_operator_update"
on public.customer_secure_documents
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

drop policy if exists "customer_document_access_events_operator_select"
  on public.customer_secure_document_access_events;
create policy "customer_document_access_events_operator_select"
on public.customer_secure_document_access_events
for select
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

drop policy if exists "customer_document_access_events_operator_insert"
  on public.customer_secure_document_access_events;
create policy "customer_document_access_events_operator_insert"
on public.customer_secure_document_access_events
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_document_access_events_customer_insert"
  on public.customer_secure_document_access_events;
create policy "customer_document_access_events_customer_insert"
on public.customer_secure_document_access_events
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and action = 'CUSTOMER_VIEW_LINK_CREATED'
  and exists (
    select 1
    from public.customer_secure_documents d
    where d.id = document_id
      and d.user_id = (select auth.uid())
  )
);

-- Private bucket. 12 MiB max. Executables, Office docs, SVG, and text are not accepted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-secure-documents',
  'customer-secure-documents',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "customer_secure_documents_storage_insert_own" on storage.objects;
create policy "customer_secure_documents_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'customer-secure-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.customer_secure_documents d
    where d.user_id = (select auth.uid())
      and d.storage_path = name
      and d.status = 'UPLOAD_PENDING'
      and d.opportunity_id is null
  )
);

drop policy if exists "customer_secure_documents_storage_select_own" on storage.objects;
create policy "customer_secure_documents_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'customer-secure-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "customer_secure_documents_storage_operator_select" on storage.objects;
create policy "customer_secure_documents_storage_operator_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'customer-secure-documents'
  and exists (
    select 1
    from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_secure_documents_storage_delete_pending_own" on storage.objects;
create policy "customer_secure_documents_storage_delete_pending_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'customer-secure-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.customer_secure_documents d
    where d.user_id = (select auth.uid())
      and d.storage_path = name
      and d.status = 'UPLOAD_PENDING'
      and d.opportunity_id is null
  )
);

create or replace function public.norautomatch_register_customer_secure_document(
  p_id uuid,
  p_kind text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $func$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if (storage.foldername(p_storage_path))[1] <> v_user_id::text then
    raise exception 'STORAGE_PATH_OWNER_MISMATCH';
  end if;

  if p_kind not in (
    'TRADE_OFFER','DRIVER_LICENSE','INSURANCE','PAYOFF_STATEMENT',
    'PROOF_OF_RESIDENCE','DEAL_STIPULATION','OTHER'
  ) then
    raise exception 'UNSUPPORTED_DOCUMENT_KIND';
  end if;

  if p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'UNSUPPORTED_DOCUMENT_TYPE';
  end if;

  if p_byte_size <= 0 or p_byte_size > 12582912 then
    raise exception 'DOCUMENT_SIZE_OUT_OF_RANGE';
  end if;

  if p_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_DOCUMENT_SHA256';
  end if;

  select count(*)
    into v_count
  from public.customer_secure_documents d
  where d.user_id = v_user_id
    and d.status not in ('REJECTED','EXPIRED');

  if v_count >= 25 then
    raise exception 'ACTIVE_DOCUMENT_LIMIT_REACHED';
  end if;

  insert into public.customer_secure_documents (
    id, user_id, opportunity_id, kind, storage_path, original_filename,
    mime_type, byte_size, sha256, status, retention_state, delete_after,
    reviewed_at, reviewed_by
  )
  values (
    p_id, v_user_id, null, p_kind, p_storage_path, left(p_original_filename,255),
    p_mime_type, p_byte_size, p_sha256, 'UPLOAD_PENDING', 'POLICY_PENDING', null,
    null, null
  );

  return p_id;
end;
$func$;

revoke all on function public.norautomatch_register_customer_secure_document(
  uuid,text,text,text,text,bigint,text
) from public, anon;
grant execute on function public.norautomatch_register_customer_secure_document(
  uuid,text,text,text,text,bigint,text
) to authenticated;

create or replace function public.norautomatch_finalize_customer_secure_document(p_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $func$
declare
  v_user_id uuid := auth.uid();
  v_path text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select d.storage_path
    into v_path
  from public.customer_secure_documents d
  where d.id = p_id
    and d.user_id = v_user_id
    and d.status = 'UPLOAD_PENDING'
    and d.opportunity_id is null
  for update;

  if v_path is null then
    raise exception 'PENDING_DOCUMENT_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'customer-secure-documents'
      and o.name = v_path
      and o.owner_id = v_user_id::text
  ) then
    raise exception 'STORAGE_OBJECT_NOT_FOUND';
  end if;

  update public.customer_secure_documents
  set status = 'RECEIVED'
  where id = p_id;
end;
$func$;

revoke all on function public.norautomatch_finalize_customer_secure_document(uuid)
  from public, anon;
grant execute on function public.norautomatch_finalize_customer_secure_document(uuid)
  to authenticated;

create or replace function public.norautomatch_abandon_pending_customer_secure_document(p_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $func$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from public.customer_secure_documents
  where id = p_id
    and user_id = v_user_id
    and status = 'UPLOAD_PENDING'
    and opportunity_id is null
    and reviewed_at is null
    and reviewed_by is null;

  if not found then
    raise exception 'PENDING_DOCUMENT_NOT_FOUND';
  end if;
end;
$func$;

revoke all on function public.norautomatch_abandon_pending_customer_secure_document(uuid)
  from public, anon;
grant execute on function public.norautomatch_abandon_pending_customer_secure_document(uuid)
  to authenticated;

create or replace function public.norautomatch_touch_customer_secure_document_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

drop trigger if exists customer_secure_documents_touch_updated_at
  on public.customer_secure_documents;
create trigger customer_secure_documents_touch_updated_at
before update on public.customer_secure_documents
for each row
execute function public.norautomatch_touch_customer_secure_document_updated_at();

create or replace function public.norautomatch_reject_document_access_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $func$
begin
  raise exception 'NorAutoMatch customer document access events are append-only';
end;
$func$;

drop trigger if exists customer_secure_document_access_events_immutable
  on public.customer_secure_document_access_events;
create trigger customer_secure_document_access_events_immutable
before update or delete on public.customer_secure_document_access_events
for each row
execute function public.norautomatch_reject_document_access_event_mutation();

comment on table public.customer_secure_documents is
  'Private customer document metadata. Raw files live only in the private customer-secure-documents storage bucket.';

comment on table public.customer_secure_document_access_events is
  'Append-only audit evidence for signed document view-link creation and manager metadata review.';
