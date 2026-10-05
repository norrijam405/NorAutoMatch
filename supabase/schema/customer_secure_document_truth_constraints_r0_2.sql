-- NorAutoMatch R2 secure-document truth constraints.

alter table public.customer_secure_documents
  drop constraint if exists customer_secure_documents_acceptance_truth;
alter table public.customer_secure_documents
  add constraint customer_secure_documents_acceptance_truth check (
    status <> 'ACCEPTED'
    or (
      opportunity_id is not null
      and reviewed_at is not null
      and reviewed_by is not null
    )
  );

alter table public.customer_secure_documents
  drop constraint if exists customer_secure_documents_pending_truth;
alter table public.customer_secure_documents
  add constraint customer_secure_documents_pending_truth check (
    status <> 'UPLOAD_PENDING'
    or (
      opportunity_id is null
      and reviewed_at is null
      and reviewed_by is null
      and raw_deleted_at is null
    )
  );

alter table public.customer_secure_documents
  drop constraint if exists customer_secure_documents_retention_truth;
alter table public.customer_secure_documents
  add constraint customer_secure_documents_retention_truth check (
    (retention_state not in ('ACTIVE','DELETE_DUE') or delete_after is not null)
    and (
      raw_deleted_at is null
      or (
        status = 'EXPIRED'
        and retention_state = 'DELETE_DUE'
        and delete_after is not null
      )
    )
    and (status <> 'EXPIRED' or raw_deleted_at is not null)
  );
