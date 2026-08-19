-- Seed Fase 5: audit_logs (tenant dev)
-- Objetivo: garantir 5 logs para paginação/filtro em /api/v1/dev/logs.

begin;

insert into public.instances (instance_key, name, status, updated_at)
values ('dev', 'CondoHub Dev', 'ACTIVE', now())
on conflict (instance_key)
do update set
  name = excluded.name,
  status = 'ACTIVE',
  suspended_at = null,
  updated_at = now();

with dev_instance as (
  select i.id as instance_id
  from public.instances i
  where i.instance_key = 'dev'
  limit 1
),
existing_actor as (
  select u.id as user_id, u.instance_id
  from public.users u
  join dev_instance di on di.instance_id = u.instance_id
  where lower(u.email) = lower('sindico@condohub.test')
  limit 1
),
inserted_actor as (
  insert into public.users (
    instance_id,
    unit_id,
    name,
    email,
    roles,
    status
  )
  select
    di.instance_id,
    null,
    'Sindico Dev',
    'sindico@condohub.test',
    array['SINDICO_ADMIN']::text[],
    'ACTIVE'
  from dev_instance di
  where not exists (select 1 from existing_actor)
  returning id as user_id, instance_id
),
actor as (
  select user_id, instance_id from existing_actor
  union all
  select user_id, instance_id from inserted_actor
),
seed_logs as (
  select *
  from (
    values
      ('a9ca1111-1111-4111-8111-111111111111'::uuid, 'AUTH_LOGIN', 'AUTH', '{"source":"seed_phase5","note":"login ok"}'::jsonb, interval '1 minute'),
      ('a9ca2222-2222-4222-8222-222222222222'::uuid, 'AUTH_LOGIN', 'AUTH', '{"source":"seed_phase5","note":"login refresh"}'::jsonb, interval '2 minute'),
      ('a9ca3333-3333-4333-8333-333333333333'::uuid, 'AUTH_REFRESH', 'AUTH', '{"source":"seed_phase5"}'::jsonb, interval '3 minute'),
      ('a9ca4444-4444-4444-8444-444444444444'::uuid, 'ACCESS_QR_VERIFIED', 'QR_ACCESS', '{"source":"seed_phase5","reason":"dev_mode_verified"}'::jsonb, interval '4 minute'),
      ('a9ca5555-5555-4555-8555-555555555555'::uuid, 'AUTH_LOGOUT', 'AUTH', '{"source":"seed_phase5"}'::jsonb, interval '5 minute')
  ) as t(id, action, target_type, metadata, age_offset)
)
insert into public.audit_logs (
  id,
  instance_id,
  action,
  target_type,
  target_id,
  unit_id,
  actor_user_id,
  ip,
  user_agent,
  request_id,
  metadata,
  created_at
)
select
  sl.id,
  di.instance_id,
  sl.action,
  sl.target_type,
  null,
  null,
  a.user_id,
  '127.0.0.1',
  'PostmanRuntime/7.x',
  concat('seed-phase5-', replace(sl.id::text, '-', '')),
  sl.metadata,
  now() - sl.age_offset
from seed_logs sl
cross join dev_instance di
cross join actor a
on conflict (id) do nothing;

-- Opcional (schema dev atual): cria credencial para login no gate Postman.
-- Senha: 123456
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_credentials'
  ) then
    insert into public.user_credentials (
      user_id,
      password_hash,
      password_updated_at,
      created_at,
      updated_at
    )
    select
      u.id,
      crypt('123456', gen_salt('bf')),
      now(),
      now(),
      now()
    from public.users u
    join public.instances i on i.id = u.instance_id
    where i.instance_key = 'dev'
      and lower(u.email) = lower('sindico@condohub.test')
    on conflict (user_id) do nothing;
  end if;
end;
$$;

commit;
