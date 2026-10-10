-- NorAutoMatch R2 FRC-26 current-only site-chat publication authority.
-- A previous/retired publication secret may not mint brand-new publication
-- authority after governed rotation.

create or replace function public.norauto_site_chat_publication_secret_trusted(
  p_secret text
)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    p_secret is not null
    and char_length(p_secret) >= 32
    and exists (
      select 1
        from public.crm_site_chat_publication_secret_anchor a
       where a.anchor_id='ACTIVE'
         and encode(public.digest(p_secret,'sha256'),'hex') = a.current_secret_sha256
    )
$$;

comment on function public.norauto_site_chat_publication_secret_trusted(text) is
  'FRC-26 publication authority is current-secret-only. A previous secret may support separately governed rotation mechanics but cannot authorize a new publication.';
