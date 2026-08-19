-- CondoHub (Supabase Postgres) — Migration 002 (DOMAINS)
-- Includes: communication, tickets, deliveries.
-- Requires Migration 001 (CORE).

-- =================
-- Communication: announcements
-- =================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  created_by_user_id uuid,
  title text not null,
  body text not null,
  require_ack boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements
  add constraint announcements_instance_id_id_uk unique (instance_id, id);

alter table public.announcements
  add constraint announcements_created_by_fk
  foreign key (instance_id, created_by_user_id) references public.users(instance_id, id);

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create index if not exists idx_announcements_instance_created
on public.announcements(instance_id, created_at desc);

create table if not exists public.announcement_acks (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  announcement_id uuid not null,
  unit_id uuid not null,
  user_id uuid not null,
  ack_at timestamptz not null default now()
);

alter table public.announcement_acks
  add constraint announcement_acks_instance_id_id_uk unique (instance_id, id);

alter table public.announcement_acks
  add constraint announcement_acks_announcement_fk
  foreign key (instance_id, announcement_id) references public.announcements(instance_id, id) on delete cascade;

alter table public.announcement_acks
  add constraint announcement_acks_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id) on delete cascade;

alter table public.announcement_acks
  add constraint announcement_acks_user_fk
  foreign key (instance_id, user_id) references public.users(instance_id, id) on delete cascade;

create unique index if not exists ux_announcement_ack_user
on public.announcement_acks(announcement_id, user_id);

create index if not exists idx_announcement_acks_instance_unit
on public.announcement_acks(instance_id, unit_id, ack_at desc);

-- =================
-- Communication: channels/posts/comments/moderation
-- =================
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  name text not null,
  visibility public.channel_visibility not null default 'PUBLIC',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channels
  add constraint channels_instance_id_id_uk unique (instance_id, id);

drop trigger if exists trg_channels_updated_at on public.channels;
create trigger trg_channels_updated_at
before update on public.channels
for each row execute function public.set_updated_at();

create unique index if not exists ux_channels_instance_name_active
on public.channels(instance_id, name)
where archived_at is null;

create index if not exists idx_channels_instance
on public.channels(instance_id);

create table if not exists public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  channel_id uuid not null,
  author_user_id uuid not null,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channel_posts
  add constraint channel_posts_instance_id_id_uk unique (instance_id, id);

alter table public.channel_posts
  add constraint channel_posts_channel_fk
  foreign key (instance_id, channel_id) references public.channels(instance_id, id) on delete cascade;

alter table public.channel_posts
  add constraint channel_posts_author_fk
  foreign key (instance_id, author_user_id) references public.users(instance_id, id) on delete cascade;

drop trigger if exists trg_channel_posts_updated_at on public.channel_posts;
create trigger trg_channel_posts_updated_at
before update on public.channel_posts
for each row execute function public.set_updated_at();

create index if not exists idx_channel_posts_channel_created
on public.channel_posts(instance_id, channel_id, created_at desc);

create index if not exists idx_channel_posts_body_trgm
on public.channel_posts using gin (body gin_trgm_ops);

create table if not exists public.channel_comments (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  post_id uuid not null,
  author_user_id uuid not null,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.channel_comments
  add constraint channel_comments_instance_id_id_uk unique (instance_id, id);

alter table public.channel_comments
  add constraint channel_comments_post_fk
  foreign key (instance_id, post_id) references public.channel_posts(instance_id, id) on delete cascade;

alter table public.channel_comments
  add constraint channel_comments_author_fk
  foreign key (instance_id, author_user_id) references public.users(instance_id, id) on delete cascade;

create index if not exists idx_channel_comments_post_created
on public.channel_comments(instance_id, post_id, created_at asc);

create index if not exists idx_channel_comments_body_trgm
on public.channel_comments using gin (body gin_trgm_ops);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  channel_id uuid,
  action text not null,
  target_user_id uuid,
  target_content_type text,
  target_content_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.moderation_actions
  add constraint moderation_actions_instance_id_id_uk unique (instance_id, id);

alter table public.moderation_actions
  add constraint moderation_actions_channel_fk
  foreign key (instance_id, channel_id) references public.channels(instance_id, id);

alter table public.moderation_actions
  add constraint moderation_actions_created_by_fk
  foreign key (instance_id, created_by_user_id) references public.users(instance_id, id);

create index if not exists idx_moderation_instance_created
on public.moderation_actions(instance_id, created_at desc);

-- =================
-- Inbox (thread per unit)
-- =================
create table if not exists public.inbox_threads (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  unit_id uuid not null,
  status public.inbox_status not null default 'ABERTO',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inbox_threads
  add constraint inbox_threads_instance_id_id_uk unique (instance_id, id);

alter table public.inbox_threads
  add constraint inbox_threads_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id) on delete cascade;

drop trigger if exists trg_inbox_threads_updated_at on public.inbox_threads;
create trigger trg_inbox_threads_updated_at
before update on public.inbox_threads
for each row execute function public.set_updated_at();

create unique index if not exists ux_inbox_thread_unit
on public.inbox_threads(instance_id, unit_id);

create index if not exists idx_inbox_threads_status_updated
on public.inbox_threads(instance_id, status, updated_at desc);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  thread_id uuid not null,
  author_user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.inbox_messages
  add constraint inbox_messages_instance_id_id_uk unique (instance_id, id);

alter table public.inbox_messages
  add constraint inbox_messages_thread_fk
  foreign key (instance_id, thread_id) references public.inbox_threads(instance_id, id) on delete cascade;

alter table public.inbox_messages
  add constraint inbox_messages_author_fk
  foreign key (instance_id, author_user_id) references public.users(instance_id, id) on delete cascade;

create index if not exists idx_inbox_messages_thread_created
on public.inbox_messages(instance_id, thread_id, created_at asc);

-- =================
-- Tickets
-- =================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  unit_id uuid not null,
  created_by_user_id uuid not null,
  assigned_to_user_id uuid,
  category text,
  location text,
  description text not null,
  status public.ticket_status not null default 'ABERTO',
  due_at timestamptz,
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tickets
  add constraint tickets_instance_id_id_uk unique (instance_id, id);

alter table public.tickets
  add constraint tickets_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id);

alter table public.tickets
  add constraint tickets_created_by_fk
  foreign key (instance_id, created_by_user_id) references public.users(instance_id, id);

alter table public.tickets
  add constraint tickets_assigned_to_fk
  foreign key (instance_id, assigned_to_user_id) references public.users(instance_id, id);

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

create index if not exists idx_tickets_instance_status_created
on public.tickets(instance_id, status, created_at desc);

create index if not exists idx_tickets_instance_unit_created
on public.tickets(instance_id, unit_id, created_at desc);

create index if not exists idx_tickets_instance_assigned_status
on public.tickets(instance_id, assigned_to_user_id, status);

create index if not exists idx_tickets_instance_due_at
on public.tickets(instance_id, due_at);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  ticket_id uuid not null,
  author_user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages
  add constraint ticket_messages_instance_id_id_uk unique (instance_id, id);

alter table public.ticket_messages
  add constraint ticket_messages_ticket_fk
  foreign key (instance_id, ticket_id) references public.tickets(instance_id, id) on delete cascade;

alter table public.ticket_messages
  add constraint ticket_messages_author_fk
  foreign key (instance_id, author_user_id) references public.users(instance_id, id);

create index if not exists idx_ticket_messages_ticket_created
on public.ticket_messages(instance_id, ticket_id, created_at asc);

create index if not exists idx_ticket_messages_body_trgm
on public.ticket_messages using gin (body gin_trgm_ops);

create table if not exists public.ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  ticket_id uuid not null,
  from_status public.ticket_status,
  to_status public.ticket_status not null,
  changed_by_user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_status_history
  add constraint ticket_status_history_instance_id_id_uk unique (instance_id, id);

alter table public.ticket_status_history
  add constraint ticket_status_history_ticket_fk
  foreign key (instance_id, ticket_id) references public.tickets(instance_id, id) on delete cascade;

alter table public.ticket_status_history
  add constraint ticket_status_history_changed_by_fk
  foreign key (instance_id, changed_by_user_id) references public.users(instance_id, id);

create index if not exists idx_ticket_status_history_ticket_created
on public.ticket_status_history(instance_id, ticket_id, created_at desc);

-- =================
-- Deliveries
-- =================
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  unit_id uuid not null,
  created_by_user_id uuid not null,
  assigned_to_user_id uuid,
  recipient_name text,
  status public.delivery_status not null default 'CHEGOU',
  delivered_to_name text,
  delivered_to_user_id uuid,
  evidence_attachment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deliveries
  add constraint deliveries_instance_id_id_uk unique (instance_id, id);

alter table public.deliveries
  add constraint deliveries_unit_fk
  foreign key (instance_id, unit_id) references public.units(instance_id, id);

alter table public.deliveries
  add constraint deliveries_created_by_fk
  foreign key (instance_id, created_by_user_id) references public.users(instance_id, id);

alter table public.deliveries
  add constraint deliveries_assigned_to_fk
  foreign key (instance_id, assigned_to_user_id) references public.users(instance_id, id);

alter table public.deliveries
  add constraint deliveries_delivered_to_fk
  foreign key (instance_id, delivered_to_user_id) references public.users(instance_id, id);

alter table public.deliveries
  add constraint deliveries_evidence_fk
  foreign key (instance_id, evidence_attachment_id) references public.attachments(instance_id, id);

drop trigger if exists trg_deliveries_updated_at on public.deliveries;
create trigger trg_deliveries_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create index if not exists idx_deliveries_instance_status_created
on public.deliveries(instance_id, status, created_at desc);

create index if not exists idx_deliveries_instance_unit_created
on public.deliveries(instance_id, unit_id, created_at desc);

create index if not exists idx_deliveries_instance_assigned_status
on public.deliveries(instance_id, assigned_to_user_id, status);

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  delivery_id uuid not null,
  event_type text not null,
  from_status public.delivery_status,
  to_status public.delivery_status,
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.delivery_events
  add constraint delivery_events_instance_id_id_uk unique (instance_id, id);

alter table public.delivery_events
  add constraint delivery_events_delivery_fk
  foreign key (instance_id, delivery_id) references public.deliveries(instance_id, id) on delete cascade;

alter table public.delivery_events
  add constraint delivery_events_actor_fk
  foreign key (instance_id, actor_user_id) references public.users(instance_id, id);

create index if not exists idx_delivery_events_delivery_created
on public.delivery_events(instance_id, delivery_id, created_at desc);

create table if not exists public.delivery_turns (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.instances(id) on delete cascade,
  staff_user_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.delivery_turns
  add constraint delivery_turns_instance_id_id_uk unique (instance_id, id);

alter table public.delivery_turns
  add constraint delivery_turns_staff_fk
  foreign key (instance_id, staff_user_id) references public.users(instance_id, id) on delete cascade;

create index if not exists idx_delivery_turns_staff_started
on public.delivery_turns(instance_id, staff_user_id, started_at desc);
