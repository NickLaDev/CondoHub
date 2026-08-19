-- Align public.audit_logs with the canonical Phase 5 contract.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'entity_type'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'target_type'
  ) then
    alter table public.audit_logs rename column entity_type to target_type;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'entity_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'target_id'
  ) then
    alter table public.audit_logs rename column entity_id to target_id;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'details_json'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'metadata'
  ) then
    alter table public.audit_logs rename column details_json to metadata;
  end if;
end;
$$;

alter table public.audit_logs
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists unit_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (select 1 from public.audit_logs where metadata is null) then
    raise exception 'audit_logs.metadata cannot be null for Phase 5 canonical schema';
  end if;

  if exists (select 1 from public.audit_logs where target_type is null) then
    raise exception 'audit_logs.target_type cannot be null for Phase 5 canonical schema';
  end if;
end;
$$;

alter table public.audit_logs
  alter column metadata set not null,
  alter column metadata set default '{}'::jsonb,
  alter column target_type set not null;

do $$
begin
  if exists (select 1 from public.audit_logs where instance_id is null) then
    raise exception 'audit_logs.instance_id cannot be null for Phase 5 canonical schema';
  end if;
end;
$$;

alter table public.audit_logs
  alter column instance_id set not null;

alter table public.audit_logs
  drop constraint if exists audit_logs_instance_id_fkey,
  drop constraint if exists audit_logs_actor_user_id_fkey,
  drop constraint if exists audit_logs_instance_fk,
  drop constraint if exists audit_logs_unit_fk,
  drop constraint if exists audit_logs_actor_fk;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_instance_fk'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_instance_fk
      foreign key (instance_id) references public.instances(id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_instance_id_id_uk'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_instance_id_id_uk
      unique (instance_id, id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_unit_fk'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_unit_fk
      foreign key (instance_id, unit_id) references public.units(instance_id, id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_actor_fk'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_actor_fk
      foreign key (instance_id, actor_user_id) references public.users(instance_id, id);
  end if;
end;
$$;

create index if not exists idx_audit_logs_instance_created_at
  on public.audit_logs (instance_id, created_at desc);

create index if not exists idx_audit_logs_instance_action_created_at
  on public.audit_logs (instance_id, action, created_at desc);

create index if not exists idx_audit_logs_instance_unit_created_at
  on public.audit_logs (instance_id, unit_id, created_at desc);
