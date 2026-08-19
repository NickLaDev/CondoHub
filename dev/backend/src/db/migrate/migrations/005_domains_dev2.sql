-- =============================================================
-- DEV 2 — Enums + Tabelas de domínio operacional
-- Pré-requisito: 001_core_dev1.sql
-- =============================================================

-- ── Helper function ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── Enums ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM (
    'ABERTO', 'EM_ANALISE', 'EM_EXECUCAO', 'RESOLVIDO', 'FECHADO', 'REABERTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_status AS ENUM (
    'CHEGOU', 'EM_DISTRIBUICAO', 'ENTREGUE', 'NAO_ENTREGUE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.channel_visibility AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inbox_status AS ENUM (
    'ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO', 'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Announcements ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  created_by_user_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  require_ack BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_created_by_fk
    FOREIGN KEY (instance_id, created_by_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_announcements_instance_created
ON public.announcements(instance_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.announcement_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL,
  unit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ack_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.announcement_acks
    ADD CONSTRAINT announcement_acks_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.announcement_acks
    ADD CONSTRAINT announcement_acks_announcement_fk
    FOREIGN KEY (instance_id, announcement_id)
    REFERENCES public.announcements(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.announcement_acks
    ADD CONSTRAINT announcement_acks_unit_fk
    FOREIGN KEY (instance_id, unit_id)
    REFERENCES public.units(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.announcement_acks
    ADD CONSTRAINT announcement_acks_user_fk
    FOREIGN KEY (instance_id, user_id)
    REFERENCES public.users(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_announcement_ack_user
ON public.announcement_acks(announcement_id, user_id);

-- ── Channels ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visibility public.channel_visibility NOT NULL DEFAULT 'PUBLIC',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.channels
    ADD CONSTRAINT channels_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_channels_updated_at ON public.channels;
CREATE TRIGGER trg_channels_updated_at
BEFORE UPDATE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_channels_instance ON public.channels(instance_id);

CREATE TABLE IF NOT EXISTS public.channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.channel_posts
    ADD CONSTRAINT channel_posts_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.channel_posts
    ADD CONSTRAINT channel_posts_channel_fk
    FOREIGN KEY (instance_id, channel_id)
    REFERENCES public.channels(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.channel_posts
    ADD CONSTRAINT channel_posts_author_fk
    FOREIGN KEY (instance_id, author_user_id)
    REFERENCES public.users(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_channel_posts_updated_at ON public.channel_posts;
CREATE TRIGGER trg_channel_posts_updated_at
BEFORE UPDATE ON public.channel_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created
ON public.channel_posts(instance_id, channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.channel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  post_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.channel_comments
    ADD CONSTRAINT channel_comments_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.channel_comments
    ADD CONSTRAINT channel_comments_post_fk
    FOREIGN KEY (instance_id, post_id)
    REFERENCES public.channel_posts(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.channel_comments
    ADD CONSTRAINT channel_comments_author_fk
    FOREIGN KEY (instance_id, author_user_id)
    REFERENCES public.users(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  channel_id UUID,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_content_type TEXT,
  target_content_id UUID,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.moderation_actions
    ADD CONSTRAINT moderation_actions_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.moderation_actions
    ADD CONSTRAINT moderation_actions_channel_fk
    FOREIGN KEY (instance_id, channel_id)
    REFERENCES public.channels(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.moderation_actions
    ADD CONSTRAINT moderation_actions_created_by_fk
    FOREIGN KEY (instance_id, created_by_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Inbox ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inbox_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL,
  status public.inbox_status NOT NULL DEFAULT 'ABERTO',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.inbox_threads
    ADD CONSTRAINT inbox_threads_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inbox_threads
    ADD CONSTRAINT inbox_threads_unit_fk
    FOREIGN KEY (instance_id, unit_id)
    REFERENCES public.units(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_inbox_threads_updated_at ON public.inbox_threads;
CREATE TRIGGER trg_inbox_threads_updated_at
BEFORE UPDATE ON public.inbox_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS ux_inbox_thread_unit
ON public.inbox_threads(instance_id, unit_id);

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.inbox_messages
    ADD CONSTRAINT inbox_messages_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inbox_messages
    ADD CONSTRAINT inbox_messages_thread_fk
    FOREIGN KEY (instance_id, thread_id)
    REFERENCES public.inbox_threads(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inbox_messages
    ADD CONSTRAINT inbox_messages_author_fk
    FOREIGN KEY (instance_id, author_user_id)
    REFERENCES public.users(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tickets ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  assigned_to_user_id UUID,
  category TEXT,
  location TEXT,
  description TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'ABERTO',
  due_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_unit_fk
    FOREIGN KEY (instance_id, unit_id)
    REFERENCES public.units(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_created_by_fk
    FOREIGN KEY (instance_id, created_by_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_assigned_to_fk
    FOREIGN KEY (instance_id, assigned_to_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tickets_instance_status_created
ON public.tickets(instance_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_instance_unit_created
ON public.tickets(instance_id, unit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.ticket_messages
    ADD CONSTRAINT ticket_messages_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_fk
    FOREIGN KEY (instance_id, ticket_id)
    REFERENCES public.tickets(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ticket_messages
    ADD CONSTRAINT ticket_messages_author_fk
    FOREIGN KEY (instance_id, author_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL,
  from_status public.ticket_status,
  to_status public.ticket_status NOT NULL,
  changed_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.ticket_status_history
    ADD CONSTRAINT ticket_status_history_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ticket_status_history
    ADD CONSTRAINT ticket_status_history_ticket_fk
    FOREIGN KEY (instance_id, ticket_id)
    REFERENCES public.tickets(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.ticket_status_history
    ADD CONSTRAINT ticket_status_history_changed_by_fk
    FOREIGN KEY (instance_id, changed_by_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Deliveries ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  assigned_to_user_id UUID,
  recipient_name TEXT,
  status public.delivery_status NOT NULL DEFAULT 'CHEGOU',
  delivered_to_name TEXT,
  delivered_to_user_id UUID,
  evidence_attachment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_unit_fk
    FOREIGN KEY (instance_id, unit_id)
    REFERENCES public.units(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_created_by_fk
    FOREIGN KEY (instance_id, created_by_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_assigned_to_fk
    FOREIGN KEY (instance_id, assigned_to_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_delivered_to_fk
    FOREIGN KEY (instance_id, delivered_to_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_evidence_fk
    FOREIGN KEY (instance_id, evidence_attachment_id)
    REFERENCES public.attachments(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER trg_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_deliveries_instance_status_created
ON public.deliveries(instance_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deliveries_instance_unit_created
ON public.deliveries(instance_id, unit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  from_status public.delivery_status,
  to_status public.delivery_status,
  actor_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.delivery_events
    ADD CONSTRAINT delivery_events_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.delivery_events
    ADD CONSTRAINT delivery_events_delivery_fk
    FOREIGN KEY (instance_id, delivery_id)
    REFERENCES public.deliveries(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.delivery_events
    ADD CONSTRAINT delivery_events_actor_fk
    FOREIGN KEY (instance_id, actor_user_id)
    REFERENCES public.users(instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.delivery_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.delivery_turns
    ADD CONSTRAINT delivery_turns_instance_id_id_uk UNIQUE (instance_id, id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.delivery_turns
    ADD CONSTRAINT delivery_turns_staff_fk
    FOREIGN KEY (instance_id, staff_user_id)
    REFERENCES public.users(instance_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;