-- CondoHub - PostgreSQL (Supabase) - Initial Schema
-- Generated from Modelagem-Banco.txt (Mermaid ER) + backend contract
-- Notes:
-- - Multi-tenant isolation is done by instance_id on almost all tables.
-- - This schema is designed to be used by the backend (server-side) using Supabase service role or direct DB connection.
-- - Recommended: enable RLS and revoke anon/authenticated privileges (see doc).

BEGIN;

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive text (emails)

-- ------------------------------------------------------------
-- ENUM types (idempotent)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instance_status') THEN
    CREATE TYPE instance_status AS ENUM ('ACTIVE','SUSPENDED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('ACTIVE','DISABLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_role') THEN
    CREATE TYPE invite_role AS ENUM ('MORADOR','SINDICO_ADMIN','FUNC_ENTREGAS','FUNC_MANUTENCAO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action_type') THEN
    CREATE TYPE moderation_action_type AS ENUM ('SILENCE_USER','REMOVE_CONTENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_content_type') THEN
    CREATE TYPE moderation_content_type AS ENUM ('CHANNEL_POST','CHANNEL_COMMENT','INBOX_MESSAGE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inbox_status') THEN
    CREATE TYPE inbox_status AS ENUM ('ABERTO','EM_ATENDIMENTO','RESOLVIDO','ARQUIVADO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('ABERTO','EM_ANALISE','EM_EXECUCAO','RESOLVIDO','FECHADO','REABERTO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM ('CHEGOU','EM_DISTRIBUICAO','ENTREGUE','NAO_ENTREGUE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_event_type') THEN
    CREATE TYPE delivery_event_type AS ENUM ('CREATED','ASSIGNED','QR_INVALID','QR_MISMATCH','DELIVERED','FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_target_type') THEN
    CREATE TYPE attachment_target_type AS ENUM (
      'ANNOUNCEMENT','CHANNEL_POST','CHANNEL_COMMENT','INBOX_MESSAGE','TICKET','TICKET_MESSAGE','DELIVERY'
    );
  END IF;
END$$;

-- ------------------------------------------------------------
-- Helpers (timestamps)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent UPDATE/DELETE for append-only tables
CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Updates/deletes are not allowed on %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- ADMIN GLOBAL (SaaS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  features_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_units int,
  max_users int,
  max_storage_mb int,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Unique plan name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ux_plans_name_ci ON plans (lower(name));

CREATE TABLE IF NOT EXISTS instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  name text NOT NULL,
  instance_key text NOT NULL,
  status instance_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  suspended_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_instances_instance_key_ci ON instances (lower(instance_key));
CREATE INDEX IF NOT EXISTS ix_instances_plan_id ON instances (plan_id);

DROP TRIGGER IF EXISTS trg_instances_updated_at ON instances;
CREATE TRIGGER trg_instances_updated_at
BEFORE UPDATE ON instances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- IAM (Auth + Refresh rotativo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE RESTRICT, -- NULL only for ADMIN_GLOBAL
  unit_id uuid, -- FK added after units creation
  name text NOT NULL,
  email citext NOT NULL,
  phone text,
  roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  token_version int NOT NULL DEFAULT 1,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

-- Unique emails:
-- - global admin: unique email where instance_id is NULL
-- - tenant users: unique (instance_id, email) where instance_id is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_global ON users (lower(email::text))
WHERE instance_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_per_instance ON users (instance_id, lower(email::text))
WHERE instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_users_instance_id ON users (instance_id);
CREATE INDEX IF NOT EXISTS ix_users_unit_id ON users (unit_id);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_user_credentials_updated_at ON user_credentials;
CREATE TRIGGER trg_user_credentials_updated_at
BEFORE UPDATE ON user_credentials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE RESTRICT, -- NULL if ADMIN_GLOBAL session
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  refresh_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_refresh_hash ON sessions (refresh_hash);
CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_instance_id ON sessions (instance_id);
CREATE INDEX IF NOT EXISTS ix_sessions_expires_at ON sessions (expires_at);

-- ------------------------------------------------------------
-- FUNDACIONAIS (Tenant)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS condo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL UNIQUE REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_condo_profiles_updated_at ON condo_profiles;
CREATE TRIGGER trg_condo_profiles_updated_at
BEFORE UPDATE ON condo_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- unique (instance_id, name) for active blocks only
CREATE UNIQUE INDEX IF NOT EXISTS ux_blocks_instance_name_active ON blocks (instance_id, lower(name))
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_blocks_instance_id ON blocks (instance_id);

DROP TRIGGER IF EXISTS trg_blocks_updated_at ON blocks;
CREATE TRIGGER trg_blocks_updated_at
BEFORE UPDATE ON blocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES blocks(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- unique (instance_id, block_id, number) for active units only
CREATE UNIQUE INDEX IF NOT EXISTS ux_units_instance_block_number_active ON units (instance_id, block_id, lower(number))
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_units_instance_id ON units (instance_id);
CREATE INDEX IF NOT EXISTS ix_units_block_id ON units (block_id);

DROP TRIGGER IF EXISTS trg_units_updated_at ON units;
CREATE TRIGGER trg_units_updated_at
BEFORE UPDATE ON units
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add FK now that units exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_unit_id'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_unit_id
      FOREIGN KEY (unit_id) REFERENCES units(id)
      ON UPDATE RESTRICT ON DELETE SET NULL;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  invited_role invite_role NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_invites_unit_scope CHECK (
    (invited_role = 'MORADOR' AND unit_id IS NOT NULL)
    OR
    (invited_role <> 'MORADOR' AND unit_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_invites_token_hash ON invites (token_hash);
CREATE INDEX IF NOT EXISTS ix_invites_instance_id ON invites (instance_id);
CREATE INDEX IF NOT EXISTS ix_invites_unit_id ON invites (unit_id);

-- ------------------------------------------------------------
-- UPLOADS / ATTACHMENTS (genérico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  unit_id uuid REFERENCES units(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  content_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_attachments_bucket_path ON attachments (bucket, path);
CREATE INDEX IF NOT EXISTS ix_attachments_instance_id ON attachments (instance_id);
CREATE INDEX IF NOT EXISTS ix_attachments_owner_user_id ON attachments (owner_user_id);
CREATE INDEX IF NOT EXISTS ix_attachments_unit_id ON attachments (unit_id);

CREATE TABLE IF NOT EXISTS attachment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  attachment_id uuid NOT NULL REFERENCES attachments(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  target_type attachment_target_type NOT NULL,
  target_id uuid NOT NULL,
  tag text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique including tag (empty string when not provided)
CREATE UNIQUE INDEX IF NOT EXISTS ux_attachment_links_unique
ON attachment_links (attachment_id, target_type, target_id, tag);

CREATE INDEX IF NOT EXISTS ix_attachment_links_instance_id ON attachment_links (instance_id);
CREATE INDEX IF NOT EXISTS ix_attachment_links_target ON attachment_links (target_type, target_id);

-- ------------------------------------------------------------
-- AUDIT / LOGS (append-only)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE SET NULL, -- NULL for global actions
  actor_user_id uuid REFERENCES users(id) ON UPDATE RESTRICT ON DELETE SET NULL, -- NULL if system
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_instance_id ON audit_logs (instance_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);

DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_update
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();

-- ------------------------------------------------------------
-- PUSH TOKENS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_push_tokens_token ON push_tokens (token);
CREATE INDEX IF NOT EXISTS ix_push_tokens_instance_id ON push_tokens (instance_id);
CREATE INDEX IF NOT EXISTS ix_push_tokens_user_id ON push_tokens (user_id);

-- ------------------------------------------------------------
-- COMMUNICATION
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  title text NOT NULL,
  body text NOT NULL,
  require_ack boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_announcements_instance_id ON announcements (instance_id);
CREATE INDEX IF NOT EXISTS ix_announcements_created_at ON announcements (created_at);

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS announcement_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_announcement_acks_unique ON announcement_acks (announcement_id, user_id);
CREATE INDEX IF NOT EXISTS ix_announcement_acks_instance_id ON announcement_acks (instance_id);

CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_channels_instance_name_active ON channels (instance_id, lower(name))
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_channels_instance_id ON channels (instance_id);

DROP TRIGGER IF EXISTS trg_channels_updated_at ON channels;
CREATE TRIGGER trg_channels_updated_at
BEFORE UPDATE ON channels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_channel_posts_channel_id ON channel_posts (channel_id);
CREATE INDEX IF NOT EXISTS ix_channel_posts_instance_id ON channel_posts (instance_id);
CREATE INDEX IF NOT EXISTS ix_channel_posts_created_at ON channel_posts (created_at);

DROP TRIGGER IF EXISTS trg_channel_posts_updated_at ON channel_posts;
CREATE TRIGGER trg_channel_posts_updated_at
BEFORE UPDATE ON channel_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS channel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES channel_posts(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_channel_comments_post_id ON channel_comments (post_id);
CREATE INDEX IF NOT EXISTS ix_channel_comments_instance_id ON channel_comments (instance_id);
CREATE INDEX IF NOT EXISTS ix_channel_comments_created_at ON channel_comments (created_at);

DROP TRIGGER IF EXISTS trg_channel_comments_updated_at ON channel_comments;
CREATE TRIGGER trg_channel_comments_updated_at
BEFORE UPDATE ON channel_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  action_type moderation_action_type NOT NULL,
  target_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  content_type moderation_content_type NOT NULL,
  content_id uuid NOT NULL,
  reason text,
  duration_minutes int,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_moderation_actions_instance_id ON moderation_actions (instance_id);
CREATE INDEX IF NOT EXISTS ix_moderation_actions_channel_id ON moderation_actions (channel_id);
CREATE INDEX IF NOT EXISTS ix_moderation_actions_target_user ON moderation_actions (target_user_id);

CREATE TABLE IF NOT EXISTS inbox_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  status inbox_status NOT NULL DEFAULT 'ABERTO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inbox_threads_instance_unit ON inbox_threads (instance_id, unit_id);

DROP TRIGGER IF EXISTS trg_inbox_threads_updated_at ON inbox_threads;
CREATE TRIGGER trg_inbox_threads_updated_at
BEFORE UPDATE ON inbox_threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES inbox_threads(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_inbox_messages_thread_id ON inbox_messages (thread_id);
CREATE INDEX IF NOT EXISTS ix_inbox_messages_instance_id ON inbox_messages (instance_id);
CREATE INDEX IF NOT EXISTS ix_inbox_messages_created_at ON inbox_messages (created_at);

-- ------------------------------------------------------------
-- TICKETS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  assigned_to_user_id uuid REFERENCES users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  category text,
  location text,
  description text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'ABERTO',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tickets_instance_id ON tickets (instance_id);
CREATE INDEX IF NOT EXISTS ix_tickets_unit_id ON tickets (unit_id);
CREATE INDEX IF NOT EXISTS ix_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS ix_tickets_due_at ON tickets (due_at);

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ticket_messages_ticket_id ON ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS ix_ticket_messages_created_at ON ticket_messages (created_at);

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  from_status ticket_status,
  to_status ticket_status NOT NULL,
  changed_by_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ticket_status_history_ticket_id ON ticket_status_history (ticket_id);
CREATE INDEX IF NOT EXISTS ix_ticket_status_history_created_at ON ticket_status_history (created_at);

-- ------------------------------------------------------------
-- DELIVERIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  assigned_to_user_id uuid REFERENCES users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  recipient_name text,
  status delivery_status NOT NULL DEFAULT 'CHEGOU',
  delivered_to_name text,
  delivered_to_user_id uuid REFERENCES users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_deliveries_instance_id ON deliveries (instance_id);
CREATE INDEX IF NOT EXISTS ix_deliveries_unit_id ON deliveries (unit_id);
CREATE INDEX IF NOT EXISTS ix_deliveries_status ON deliveries (status);
CREATE INDEX IF NOT EXISTS ix_deliveries_created_at ON deliveries (created_at);

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON deliveries;
CREATE TRIGGER trg_deliveries_updated_at
BEFORE UPDATE ON deliveries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  type delivery_event_type NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_delivery_events_delivery_id ON delivery_events (delivery_id);
CREATE INDEX IF NOT EXISTS ix_delivery_events_created_at ON delivery_events (created_at);

CREATE TABLE IF NOT EXISTS delivery_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES instances(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_delivery_turns_instance_id ON delivery_turns (instance_id);
CREATE INDEX IF NOT EXISTS ix_delivery_turns_user_id ON delivery_turns (user_id);

-- unique partial for active turn
CREATE UNIQUE INDEX IF NOT EXISTS ux_delivery_turns_active
ON delivery_turns (instance_id, user_id)
WHERE ended_at IS NULL;

COMMIT;
