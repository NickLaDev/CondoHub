create index if not exists idx_instances_plan_id on public.instances (plan_id);

create index if not exists idx_users_instance_id on public.users (instance_id);
create index if not exists idx_users_instance_unit_id on public.users (instance_id, unit_id);

create index if not exists idx_sessions_instance_id on public.sessions (instance_id);
create index if not exists idx_sessions_user_id on public.sessions (user_id);
create index if not exists idx_sessions_expires_at on public.sessions (expires_at);

create index if not exists idx_condo_profile_instance_id on public.condo_profile (instance_id);

create index if not exists idx_blocks_instance_id on public.blocks (instance_id);
create index if not exists idx_blocks_instance_archived_at on public.blocks (instance_id, archived_at);

create index if not exists idx_units_instance_id on public.units (instance_id);
create index if not exists idx_units_instance_block_id on public.units (instance_id, block_id);

create index if not exists idx_invites_instance_id on public.invites (instance_id);
create index if not exists idx_invites_instance_expires_at on public.invites (instance_id, expires_at);
create index if not exists idx_invites_instance_used_at on public.invites (instance_id, used_at);

create index if not exists idx_attachments_instance_id on public.attachments (instance_id);
create index if not exists idx_attachments_instance_created_at on public.attachments (instance_id, created_at desc);
create index if not exists idx_attachments_instance_owner on public.attachments (instance_id, owner_user_id);

create index if not exists idx_attachment_links_instance_id on public.attachment_links (instance_id);
create index if not exists idx_attachment_links_instance_target
  on public.attachment_links (instance_id, target_type, target_id);

create index if not exists idx_audit_logs_instance_id on public.audit_logs (instance_id);
create index if not exists idx_audit_logs_instance_created_at
  on public.audit_logs (instance_id, created_at desc);
create index if not exists idx_audit_logs_instance_action_created_at
  on public.audit_logs (instance_id, action, created_at desc);

create index if not exists idx_push_tokens_instance_id on public.push_tokens (instance_id);
create index if not exists idx_push_tokens_instance_user_id on public.push_tokens (instance_id, user_id);
