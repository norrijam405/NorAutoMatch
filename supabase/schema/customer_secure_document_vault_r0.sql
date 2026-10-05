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
  status text not null default 'RECEIVED' check (status in ('RECEIVED','REVIEW_REQUIRED','ACCEPTED','REJECTED','EXPIRED')),
  retention_state text not null default 'POLICY_PENDING' check (retention_state in ('POLICY_PENDING','ACTIVE','DELETE_DUE','PRESERVED')),
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

create table if not exists public.customer_secure_document_access_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.customer_secure_documents(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('MANAGER_VIEW_LINK_CREATED','CUSTOMER_VIEW_LINK_CREATED','MANAGER_METADATA_REVIEWED')),
  created_at timestamptz not null default now()
);

create index if not exists customer_secure_document_access_doc_idx
  on public.customer_secure_document_access_events (document_id, created_at desc);

alter table public.customer_secure_documents enable row level security;
alter table public.customer_secure_document_access_events enable row level security;

revoke all on table public.customer_secure_documents from anon, authenticated;
revoke all on table public.customer_secure_document_access_events from anon, authenticated;

grant select, insert, update, delete on table public.customer_secure_documents to authenticated;
grant select, insert on table public.customer_secure_document_access_events to authenticated;

drop policy if exists "customer_secure_documents_select_own" on public.customer_secure_documents;
create policy "customer_secure_documents_select_own"
on public.customer_secure_documents for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "customer_secure_documents_insert_own" on public.customer_secure_documents;
create policy "customer_secure_documents_insert_own"
on public.customer_secure_documents for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and opportunity_id is null
  and reviewed_at is null
  and reviewed_by is null
  and status = 'RECEIVED'
  and retention_state = 'POLICY_PENDING'
  and delete_after is null
  and (storage.foldername(storage_path))[1] = (select auth.uid())::text
);

drop policy if exists "customer_secure_documents_delete_unlinked_own" on public.customer_secure_documents;
create policy "customer_secure_documents_delete_unlinked_own"
on public.customer_secure_documents for delete to authenticated
using (
  (select auth.uid()) = user_id
  and opportunity_id is null
  and reviewed_at is null
  and reviewed_by is null
);

drop policy if exists "customer_secure_documents_operator_select" on public.customer_secure_documents;
create policy "customer_secure_documents_operator_select"
on public.customer_secure_documents for select to authenticated
using (
  exists (
    select 1 from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_secure_documents_operator_update" on public.customer_secure_documents;
create policy "customer_secure_documents_operator_update"
on public.customer_secure_documents for update to authenticated
using (
  exists (
    select 1 from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
)
with check (
  exists (
    select 1 from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_document_access_events_operator_select" on public.customer_secure_document_access_events;
create policy "customer_document_access_events_operator_select"
on public.customer_secure_document_access_events for select to authenticated
using (
  exists (
    select 1 from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_document_access_events_operator_insert" on public.customer_secure_document_access_events;
create policy "customer_document_access_events_operator_insert"
on public.customer_secure_document_access_events for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and exists (
    select 1 from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_document_access_events_customer_insert" on public.customer_secure_document_access_events;
create policy "customer_document_access_events_customer_insert"
on public.customer_secure_document_access_events for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and action = 'CUSTOMER_VIEW_LINK_CREATED'
  and exists (
    select 1 from public.customer_secure_documents d
    where d.id = document_id and d.user_id = (select auth.uid())
  )
);

-- Storage bucket remains private. 12 MiB max; no office documents or executables.
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
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-secure-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "customer_secure_documents_storage_select_own" on storage.objects;
create policy "customer_secure_documents_storage_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-secure-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "customer_secure_documents_storage_operator_select" on storage.objects;
create policy "customer_secure_documents_storage_operator_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-secure-documents'
  and exists (
    select 1 from public.app_memberships m
    where m.user_id = (select auth.uid())
      and m.app_id = 'norautomatch'
      and m.active = true
      and m.role in ('operator','admin','founder')
  )
);

drop policy if exists "customer_secure_documents_storage_delete_unlinked_own" on storage.objects;
create policy "customer_secure_documents_storage_delete_unlinked_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-secure-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.customer_secure_documents d
    where d.storage_path = name and d.opportunity_id is not null
  )
);

create or replace function public.norautomatch_touch_customer_secure_document_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_secure_documents_touch_updated_at on public.customer_secure_documents;
create trigger customer_secure_documents_touch_updated_at
before update on public.customer_secure_documents
for each row execute function public.norautomatch_touch_customer_secure_document_updated_at();

create or replace function public.norautomatch_reject_document_access_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'NorAutoMatch customer document access events are append-only';
end;
$$;

drop trigger if exists customer_secure_document_access_events_immutable on public.customer_secure_document_access_events;
create trigger customer_secure_document_access_events_immutable
before update or delete on public.customer_secure_document_access_events
for each row execute function public.norautomatch_reject_document_access_event_mutation();

comment on table public.customer_secure_documents is
  'Private customer document metadata. Raw files live only in the private customer-secure-documents storage bucket.';
comment on table public.customer_secure_document_access_events is
  'Append-only audit evidence for signed document view-link creation and manager metadata review.';
