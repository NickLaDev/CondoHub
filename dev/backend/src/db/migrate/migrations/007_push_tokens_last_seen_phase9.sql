-- Align push_tokens with canonical Phase 9 schema.

alter table public.push_tokens
  add column if not exists last_seen_at timestamptz;

update public.push_tokens
set last_seen_at = created_at
where last_seen_at is null;
