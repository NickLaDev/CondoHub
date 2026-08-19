-- CondoHub (Supabase Postgres) — Migration 001 (CORE)
-- Includes: extensions, enums, admin global, IAM, structure, invites, attachments, audit/logs, push tokens
-- Safe to run once on a fresh DB.

-- ===========
-- Extensions
-- ===========
create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists citext;    -- case-insensitive text (email)
create extension if not exists pg_trgm;   -- optional search indexes

-- =======================
-- updated_at helper
-- =======================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =========
-- Enums
-- =========
do $$ begin
  create type public.instance_status as enum ('ACTIVE','SUSPENDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('ACTIVE','DISABLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum ('ABERTO','EM_ANALISE','EM_EXECUCAO','RESOLVIDO','FECHADO','REABERTO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('CHEGOU','EM_DISTRIBUICAO','ENTREGUE','NAO_ENTREGUE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inbox_status as enum ('ABERTO','EM_ATENDIMENTO','RESOLVIDO','ARQUIVADO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.channel_visibility as enum ('PUBLIC','PRIVATE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.push_platform as enum ('android','ios','web');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attachment_status as enum ('PENDING','READY','FAILED','DELETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_kind as enum ('RESIDENT_JOIN','VISITOR');
exception when duplicate_object then null; end $$;

-- =================
-- Admin Global
-- =================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  price_cents int,
  currency text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_active on public.plans(archived_at);

create table if not exists public.instances (
  id uuid primary key default gen_random_uuid(),
  instance_key text not null unique,
  name text not null,
  status public.instance_status not null default 'ACTIVE',
  plan_id uuid references public.plans(id),
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instances_status on public.instances(status);
create index if not exists idx_instances_plan on public.instances(plan_id);

drop trigger if exists trg_instances_updated_at on public.instances;
create trigger trg_instances_updated_at
before update on public.instances
for each row execute function public.set_updated_at();

-- =================
-- IAM (users/sessions)
-- =================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),

  -- NULL => ADMIN_GLOBAL user
  instance_id uuid references public.instances(id),
  unit_id uuid,

  name text not null,
  email citext,
  phone text,

  password_hash text not null,
  roles text[] not null,

  status public.user_status not null default 'ACTIVE',
  token_version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

-- Allow composite FKs from tenant tables
alter table public.users
  add constraint users_instance_id_id_uk unique (instance_id, id);

-- Roles must be one of the contract roles
alter table public.users
  add constraint users_roles_allowed_check
  check (
    roles <@ array['ADMIN_GLOBAL','SINDICO_ADMIN','FUNC_ENTREGAS','FUNC_MANUTENCAO','MORADOR']::text[]
  );

-- If instance_id is NULL => must include ADMIN_GLOBAL; if instance_id is NOT NULL => cannot include ADMIN_GLOBAL
alter table public.users
  add constraint users_admin_global_scope_check
  check (
    (instance_id is null and roles @> array['ADMIN_GLOBAL']::text[])
    or
    (instance_id is not null and not (roles @> array['ADMIN_GLOBAL']::text[]))
  );

-- If MORADOR => must have instance_id + unit_id
alter table public.users
  add constraint users_morador_requires_unit_check
  check (
    not (roles @> array['MORADOR']::text[])
    or
    (instance_id is not null and unit_id is not null)
  );

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- Unique email per tenant (and unique email for admin global users)
create unique index if not exists ux_users_instance_email
on public.users(instance_id, email)
where instance_id is not null and email is not null;

create unique index if not exists ux_users_admin_email
on public.users(email)
where instance_id is null and email is not null;

create index if not exists idx_users_instance on public.users(instance_id);
create index if not exists idx_users_instance_unit on public.users(instance_id, unit_id);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  ip text,
  user_agent text,
  request_id text
);

create index if not exists idx_sessions_user_expires on public.sessions(user_id, expires_at);
create index if not exists idx_sessions_expires on public.sessions(expires_at);

-- =================
-- Tenant fundacional
-- =================
create table if not exists public.condo_profile (
  instance_id uuid primary key references public.instances(id) on delete cascade,
  display_name text not null,
  legal_name text,
  address jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_condo_profile_updated_at on public.condo_profile;
create trigger trg_condo_profile_updated_at
before update on public.condo_profile
for each row execute function public.set_updated_at();

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  label text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.blocks
  add constraint blocks_instance_id_id_uk unique (instance_id, id);

create unique index if not exists ux_blocks_instance_label
on public.blocks(instance_id, label)
where archived_at is null;

create index if not exists idx_blocks_instance on public.blocks(instance_id);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  block_id uuid,
  label text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.units
  add constraint units_instance_id_id_uk unique (instance_id, id);

-- Composite FK ensures unit.block_id belongs to the same instance
alter table public.units
  add constraint units_block_fk
  foreign key (instance_id, block_id) references public.blocks(instance_id, id);

create unique index if not exists ux_units_instance_label
on public.units(instance_id, label)
where archived_at is null;

create index if not exists idx_units_instance on public.units(instance_id);
create index if not exists idx_units_instance_block on public.units(instance_id, block_id);

-- Users.unit_id must belong to same instance (composite FK). If instance_id is null, unit_id must be null by check above.
alter table public.users
  add constraint users_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id);

-- =================
-- Invites
-- =================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  unit_id uuid not null,
  kind public.invite_kind not null default 'RESIDENT_JOIN',
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.invites
  add constraint invites_instance_id_id_uk unique (instance_id, id);

alter table public.invites
  add constraint invites_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id);

alter table public.invites
  add constraint invites_created_by_fk
  foreign key (instance_id, created_by_user_id) references public.users(instance_id, id);

create index if not exists idx_invites_instance_unit_expires on public.invites(instance_id, unit_id, expires_at);
create index if not exists idx_invites_instance_used on public.invites(instance_id, used_at);
create index if not exists idx_invites_instance_revoked on public.invites(instance_id, revoked_at);

-- =================
-- Attachments + Links
-- =================
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  owner_user_id uuid,
  unit_id uuid,
  status public.attachment_status not null default 'PENDING',
  bucket text not null default 'attachments',
  path text not null,
  content_type text not null,
  size_bytes int not null,
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.attachments
  add constraint attachments_instance_id_id_uk unique (instance_id, id);

drop trigger if exists trg_attachments_updated_at on public.attachments;
create trigger trg_attachments_updated_at
before update on public.attachments
for each row execute function public.set_updated_at();

-- Ensure owner and unit are within same instance (composite FK)
alter table public.attachments
  add constraint attachments_owner_fk
  foreign key (instance_id, owner_user_id) references public.users(instance_id, id);

alter table public.attachments
  add constraint attachments_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id);

create index if not exists idx_attachments_instance_status_created
on public.attachments(instance_id, status, created_at desc);

create index if not exists idx_attachments_instance_owner_created
on public.attachments(instance_id, owner_user_id, created_at desc);

-- optional: avoid duplicated objects in same bucket
create unique index if not exists ux_attachments_bucket_path
on public.attachments(bucket, path);

create table if not exists public.attachment_links (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  attachment_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.attachment_links
  add constraint attachment_links_instance_id_id_uk unique (instance_id, id);

alter table public.attachment_links
  add constraint attachment_links_attachment_fk
  foreign key (instance_id, attachment_id) references public.attachments(instance_id, id) on delete cascade;

create index if not exists idx_attachment_links_target
on public.attachment_links(instance_id, target_type, target_id);

create index if not exists idx_attachment_links_attachment
on public.attachment_links(instance_id, attachment_id);

-- =================
-- Audit Logs (append-only)
-- =================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,

  action text not null,
  target_type text not null,
  target_id uuid,
  unit_id uuid,
  actor_user_id uuid,

  ip text,
  user_agent text,
  request_id text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add constraint audit_logs_instance_id_id_uk unique (instance_id, id);

alter table public.audit_logs
  add constraint audit_logs_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id);

alter table public.audit_logs
  add constraint audit_logs_actor_fk
  foreign key (instance_id, actor_user_id) references public.users(instance_id, id);

create index if not exists idx_audit_instance_created_at
on public.audit_logs(instance_id, created_at desc);

create index if not exists idx_audit_instance_action_created_at
on public.audit_logs(instance_id, action, created_at desc);

create index if not exists idx_audit_instance_unit_created_at
on public.audit_logs(instance_id, unit_id, created_at desc);

-- =================
-- Push tokens
-- =================
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  user_id uuid not null,
  platform public.push_platform not null,
  token text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.push_tokens
  add constraint push_tokens_instance_id_id_uk unique (instance_id, id);

alter table public.push_tokens
  add constraint push_tokens_user_fk
  foreign key (instance_id, user_id) references public.users(instance_id, id) on delete cascade;

create unique index if not exists ux_push_tokens_instance_token_active
on public.push_tokens(instance_id, token)
where revoked_at is null;

create index if not exists idx_push_tokens_instance_user
on public.push_tokens(instance_id, user_id);
