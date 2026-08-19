-- Align tenant foundational schema with canonical Phase 8 contract.
-- Scope: condo_profile, blocks, units, invites.

-- ============
-- condo_profile
-- ============

alter table public.condo_profile
  add column if not exists display_name text,
  add column if not exists legal_name text,
  add column if not exists settings jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'condo_profile'
      and column_name = 'name'
  ) then
    update public.condo_profile
    set display_name = coalesce(display_name, name)
    where display_name is null;
  end if;
end;
$$;

update public.condo_profile cp
set display_name = i.name
from public.instances i
where cp.instance_id = i.id
  and (cp.display_name is null or btrim(cp.display_name) = '');

do $$
declare
  address_type text;
begin
  select c.udt_name
  into address_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'condo_profile'
    and c.column_name = 'address';

  if address_type is null then
    alter table public.condo_profile
      add column address jsonb not null default '{}'::jsonb;
  elsif address_type <> 'jsonb' then
    alter table public.condo_profile
      alter column address drop default;

    alter table public.condo_profile
      alter column address type jsonb
      using (
        case
          when address is null or btrim(address) = '' then '{}'::jsonb
          else jsonb_build_object('raw', address)
        end
      );

    alter table public.condo_profile
      alter column address set default '{}'::jsonb;
  end if;
end;
$$;

update public.condo_profile
set address = '{}'::jsonb
where address is null;

update public.condo_profile
set settings = '{}'::jsonb
where settings is null;

alter table public.condo_profile
  alter column display_name set not null,
  alter column address set not null,
  alter column address set default '{}'::jsonb,
  alter column settings set not null,
  alter column settings set default '{}'::jsonb;

-- ======
-- blocks
-- ======

alter table public.blocks
  add column if not exists label text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blocks'
      and column_name = 'name'
  ) then
    update public.blocks
    set label = coalesce(label, name)
    where label is null;
  end if;
end;
$$;

alter table public.blocks
  alter column label set not null;

alter table public.blocks
  drop constraint if exists blocks_instance_name_uk;

create unique index if not exists ux_blocks_instance_label_active
  on public.blocks (instance_id, label)
  where archived_at is null;

-- =====
-- units
-- =====

alter table public.units
  add column if not exists label text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'units'
      and column_name = 'number'
  ) then
    update public.units
    set label = coalesce(label, number)
    where label is null;
  end if;
end;
$$;

alter table public.units
  alter column label set not null;

alter table public.units
  alter column block_id drop not null;

alter table public.units
  drop constraint if exists units_instance_block_number_uk;

create unique index if not exists ux_units_instance_label_active
  on public.units (instance_id, label)
  where archived_at is null;

-- =======
-- invites
-- =======

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'invite_kind'
  ) then
    create type public.invite_kind as enum ('RESIDENT_JOIN', 'VISITOR');
  end if;
end;
$$;

alter table public.invites
  add column if not exists kind public.invite_kind,
  add column if not exists created_by_user_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invites'
      and column_name = 'invited_role'
  ) then
    update public.invites
    set kind = case
      when invited_role = 'MORADOR' then 'RESIDENT_JOIN'::public.invite_kind
      else 'VISITOR'::public.invite_kind
    end
    where kind is null;
  else
    update public.invites
    set kind = 'RESIDENT_JOIN'::public.invite_kind
    where kind is null;
  end if;
end;
$$;

alter table public.invites
  alter column kind set default 'RESIDENT_JOIN'::public.invite_kind,
  alter column kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invites_instance_id_id_uk'
      and conrelid = 'public.invites'::regclass
  ) then
    alter table public.invites
      add constraint invites_instance_id_id_uk unique (instance_id, id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invites_created_by_fk'
      and conrelid = 'public.invites'::regclass
  ) then
    alter table public.invites
      add constraint invites_created_by_fk
      foreign key (instance_id, created_by_user_id) references public.users(instance_id, id);
  end if;
end;
$$;

create index if not exists idx_invites_instance_unit_expires
  on public.invites (instance_id, unit_id, expires_at);

create index if not exists idx_invites_instance_used
  on public.invites (instance_id, used_at);

create index if not exists idx_invites_instance_revoked
  on public.invites (instance_id, revoked_at);
