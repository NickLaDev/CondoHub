-- Align public.plans with canonical Admin Global fields for Phase 7.

alter table public.plans
  add column if not exists features jsonb,
  add column if not exists limits jsonb,
  add column if not exists price_cents int,
  add column if not exists currency text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plans'
      and column_name = 'features_json'
  ) then
    update public.plans
    set features = coalesce(features, features_json, '{}'::jsonb)
    where features is null;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plans'
      and column_name = 'max_units'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plans'
      and column_name = 'max_users'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plans'
      and column_name = 'max_storage_mb'
  ) then
    update public.plans
    set limits = jsonb_strip_nulls(
      jsonb_build_object(
        'maxUnits', max_units,
        'maxUsers', max_users,
        'maxStorageMb', max_storage_mb
      )
    )
    where limits is null
      or limits = '{}'::jsonb;
  end if;
end;
$$;

update public.plans
set features = '{}'::jsonb
where features is null;

update public.plans
set limits = '{}'::jsonb
where limits is null;

alter table public.plans
  alter column features set default '{}'::jsonb,
  alter column features set not null,
  alter column limits set default '{}'::jsonb,
  alter column limits set not null;

create index if not exists idx_plans_archived_at
  on public.plans (archived_at);
