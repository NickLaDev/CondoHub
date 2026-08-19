-- Phase 1: invite code flow (hashed codes + lifecycle metadata).

alter table public.invites
  add column if not exists code_hash text,
  add column if not exists code_last4 text,
  add column if not exists used_by_user_id uuid,
  add column if not exists cancelled_reason text;

create index if not exists idx_invites_instance_code_hash
  on public.invites (instance_id, code_hash)
  where code_hash is not null;

create index if not exists idx_invites_code_active_by_unit
  on public.invites (instance_id, unit_id, expires_at desc, created_at desc)
  where code_hash is not null
    and used_at is null
    and revoked_at is null
    and cancelled_reason is null;

create index if not exists idx_invites_instance_used_by_user
  on public.invites (instance_id, used_by_user_id)
  where used_by_user_id is not null;
