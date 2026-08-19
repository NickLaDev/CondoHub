-- Align public.attachments with Phase 6 canonical contract.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'attachment_status'
  ) then
    create type public.attachment_status as enum ('PENDING', 'READY', 'FAILED', 'DELETED');
  end if;
end;
$$;

alter table public.attachments
  add column if not exists status public.attachment_status,
  add column if not exists checksum_sha256 text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz;

alter table public.attachments
  alter column bucket set default 'attachments';

alter table public.attachments
  alter column owner_user_id drop not null;

update public.attachments
set status = 'READY'
where status is null;

alter table public.attachments
  alter column status set default 'PENDING',
  alter column status set not null;

update public.attachments
set completed_at = coalesce(completed_at, created_at)
where status = 'READY'
  and completed_at is null;

create index if not exists idx_attachments_instance_status_created
  on public.attachments (instance_id, status, created_at desc);

create index if not exists idx_attachments_instance_owner_created
  on public.attachments (instance_id, owner_user_id, created_at desc);
