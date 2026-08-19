create extension if not exists pgcrypto;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  features_json jsonb not null default '{}'::jsonb,
  max_units int,
  max_users int,
  max_storage_mb int,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.instances (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id),
  name text not null,
  instance_key text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz
);

create table if not exists public.condo_profile (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null unique references public.instances(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint blocks_instance_id_id_uk unique (instance_id, id),
  constraint blocks_instance_name_uk unique (instance_id, name)
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  block_id uuid not null,
  number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint units_instance_id_id_uk unique (instance_id, id),
  constraint units_instance_block_number_uk unique (instance_id, block_id, number),
  constraint units_block_fk
    foreign key (instance_id, block_id) references public.blocks(instance_id, id) on delete restrict
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references public.instances(id) on delete cascade,
  unit_id uuid,
  name text not null,
  email text,
  phone text,
  roles text[] not null,
  token_version int not null default 1,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint users_instance_id_id_uk unique (instance_id, id),
  constraint users_roles_not_empty_ck check (cardinality(roles) > 0),
  constraint users_roles_allowed_ck check (
    roles <@ array['ADMIN_GLOBAL', 'SINDICO_ADMIN', 'FUNC_ENTREGAS', 'FUNC_MANUTENCAO', 'MORADOR']::text[]
  ),
  constraint users_scope_ck check (
    (instance_id is null and roles = array['ADMIN_GLOBAL']::text[])
    or
    (instance_id is not null and not (roles @> array['ADMIN_GLOBAL']::text[]))
  ),
  constraint users_morador_unit_ck check (
    ((roles @> array['MORADOR']::text[]) and unit_id is not null)
    or
    ((not (roles @> array['MORADOR']::text[])) and unit_id is null)
  ),
  constraint users_unit_fk
    foreign key (instance_id, unit_id) references public.units(instance_id, id) on delete set null
);

create unique index if not exists ux_users_instance_email
  on public.users (instance_id, email)
  where instance_id is not null and email is not null;

create unique index if not exists ux_users_admin_global_email
  on public.users (email)
  where instance_id is null and email is not null;

create table if not exists public.user_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  password_hash text not null,
  password_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references public.instances(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  constraint sessions_instance_user_fk
    foreign key (instance_id, user_id) references public.users(instance_id, id) on delete cascade
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  unit_id uuid,
  invited_role text not null check (
    invited_role in ('MORADOR', 'SINDICO_ADMIN', 'FUNC_ENTREGAS', 'FUNC_MANUTENCAO')
  ),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_instance_unit_fk
    foreign key (instance_id, unit_id) references public.units(instance_id, id) on delete set null,
  constraint invites_unit_role_ck check (
    (invited_role = 'MORADOR' and unit_id is not null)
    or
    (invited_role <> 'MORADOR' and unit_id is null)
  )
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  owner_user_id uuid not null,
  unit_id uuid,
  bucket text not null,
  path text not null,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint attachments_instance_id_id_uk unique (instance_id, id),
  constraint attachments_bucket_path_uk unique (bucket, path),
  constraint attachments_owner_fk
    foreign key (instance_id, owner_user_id) references public.users(instance_id, id) on delete restrict,
  constraint attachments_unit_fk
    foreign key (instance_id, unit_id) references public.units(instance_id, id) on delete set null
);

create table if not exists public.attachment_links (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  attachment_id uuid not null,
  target_type text not null check (
    target_type in (
      'ANNOUNCEMENT',
      'CHANNEL_POST',
      'CHANNEL_COMMENT',
      'INBOX_MESSAGE',
      'TICKET',
      'TICKET_MESSAGE',
      'DELIVERY'
    )
  ),
  target_id uuid not null,
  tag text,
  created_at timestamptz not null default now(),
  constraint attachment_links_instance_id_id_uk unique (instance_id, id),
  constraint attachment_links_attachment_fk
    foreign key (instance_id, attachment_id) references public.attachments(instance_id, id) on delete cascade
);

create unique index if not exists ux_attachment_links_target
  on public.attachment_links (attachment_id, target_type, target_id, tag);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references public.instances(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details_json jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  request_id text,
  created_at timestamptz not null default now()
);

create or replace function public.audit_logs_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

drop trigger if exists trg_audit_logs_append_only on public.audit_logs;
create trigger trg_audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function public.audit_logs_append_only();

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  user_id uuid not null,
  token text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint push_tokens_instance_id_id_uk unique (instance_id, id),
  constraint push_tokens_user_fk
    foreign key (instance_id, user_id) references public.users(instance_id, id) on delete cascade
);
