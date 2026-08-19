-- Seed minima para Fase 2 (Tenant Resolver real)
-- Execute no Supabase SQL Editor

insert into public.instances (instance_key, status, created_at, updated_at)
values ('dev', 'ACTIVE', now(), now())
on conflict (instance_key)
do update set
  status = 'ACTIVE',
  suspended_at = null,
  updated_at = now();

insert into public.instances (instance_key, status, created_at, updated_at, suspended_at)
values ('susp', 'SUSPENDED', now(), now(), now())
on conflict (instance_key)
do update set
  status = 'SUSPENDED',
  suspended_at = now(),
  updated_at = now();
