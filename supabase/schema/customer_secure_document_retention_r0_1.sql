-- NorAutoMatch R2 secure document retention hardening.
-- Adds configurable retention dates and a bounded manager deletion path for due raw files.

alter table public.customer_secure_documents
  add column if not exists raw_deleted_at timestamptz null;

alter table public.customer_secure_document_access_events
  drop constraint if exists customer_secure_document_access_events_action_check;

alter table public.customer_secure_document_access_events
  add constraint customer_secure_document_access_events_action_check
  check (action in (
    'MANAGER_VIEW_LINK_CREATED',
    'CUSTOMER_VIEW_LINK_CREATED',
    'MANAGER_METADATA_REVIEWED',
    'MANAGER_RAW_DOCUMENT_DELETED'
  ));

create or replace function public.norautomatch_register_customer_secure_document_v2(
  p_id uuid,
  p_kind text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_sha256 text,
  p_retention_days integer
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

  if p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'RETENTION_DAYS_OUT_OF_RANGE';
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

  select count(*) into v_count
  from public.customer_secure_documents d
  where d.user_id = v_user_id
    and d.status not in ('REJECTED','EXPIRED');

  if v_count >= 25 then
    raise exception 'ACTIVE_DOCUMENT_LIMIT_REACHED';
  end if;

  insert into public.customer_secure_documents (
    id, user_id, opportunity_id, kind, storage_path, original_filename,
    mime_type, byte_size, sha256, status, retention_state, delete_after,
    reviewed_at, reviewed_by, raw_deleted_at
  ) values (
    p_id, v_user_id, null, p_kind, p_storage_path, left(p_original_filename,255),
    p_mime_type, p_byte_size, p_sha256, 'UPLOAD_PENDING', 'ACTIVE',
    now() + make_interval(days => p_retention_days),
    null, null, null
  );

  return p_id;
end;
$func$;

revoke all on function public.norautomatch_register_customer_secure_document_v2(
  uuid,text,text,text,text,bigint,text,integer
) from public, anon;
grant execute on function public.norautomatch_register_customer_secure_document_v2(
  uuid,text,text,text,text,bigint,text,integer
) to authenticated;

-- The original registration RPC is retained for migration history but disabled for browser roles.
revoke execute on function public.norautomatch_register_customer_secure_document(
  uuid,text,text,text,text,bigint,text
) from authenticated;

drop policy if exists "customer_secure_documents_storage_operator_delete_due" on storage.objects;
create policy "customer_secure_documents_storage_operator_delete_due"
on storage.objects
for delete
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
  and exists (
    select 1
    from public.customer_secure_documents d
    where d.storage_path = name
      and d.retention_state = 'DELETE_DUE'
      and d.delete_after is not null
      and d.delete_after <= now()
      and d.raw_deleted_at is null
  )
);
