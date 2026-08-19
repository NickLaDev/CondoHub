import { AppError } from "../../core/contract/errors";
import { getDbPool } from "../../db/pool";

function toIso(v: Date | string | null): string | null {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return !isNaN(d.getTime()) ? d.toISOString() : String(v);
}

// ── Channel ──────────────────────────────────────────
type ChannelRow = {
  id: string;
  instance_id: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  archived_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type ChannelRecord = {
  id: string;
  instanceId: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapChannel(r: ChannelRow): ChannelRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    name: r.name,
    visibility: r.visibility,
    archivedAt: toIso(r.archived_at),
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Post ─────────────────────────────────────────────
type PostRow = {
  id: string;
  instance_id: string;
  channel_id: string;
  author_user_id: string;
  body: string;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type PostRecord = {
  id: string;
  instanceId: string;
  channelId: string;
  authorUserId: string;
  body: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapPost(r: PostRow): PostRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    channelId: r.channel_id,
    authorUserId: r.author_user_id,
    body: r.body,
    deletedAt: toIso(r.deleted_at),
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Comment ──────────────────────────────────────────
type CommentRow = {
  id: string;
  instance_id: string;
  post_id: string;
  author_user_id: string;
  body: string;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CommentRecord = {
  id: string;
  instanceId: string;
  postId: string;
  authorUserId: string;
  body: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapComment(r: CommentRow): CommentRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    postId: r.post_id,
    authorUserId: r.author_user_id,
    body: r.body,
    deletedAt: toIso(r.deleted_at),
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Moderation Action ────────────────────────────────
type ModerationActionRow = {
  id: string;
  instance_id: string;
  channel_id: string;
  action: string;
  target_user_id: string | null;
  target_content_type: string | null;
  target_content_id: string | null;
  reason: string | null;
  metadata: any;
  created_by_user_id: string;
  created_at: Date | string;
};

export type ModerationActionRecord = {
  id: string;
  instanceId: string;
  channelId: string;
  action: string;
  targetUserId: string | null;
  targetContentType: string | null;
  targetContentId: string | null;
  reason: string | null;
  metadata: any;
  createdByUserId: string;
  createdAt: string;
};

function mapModerationAction(r: ModerationActionRow): ModerationActionRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    channelId: r.channel_id,
    action: r.action,
    targetUserId: r.target_user_id,
    targetContentType: r.target_content_type,
    targetContentId: r.target_content_id,
    reason: r.reason,
    metadata: r.metadata,
    createdByUserId: r.created_by_user_id,
    createdAt: toIso(r.created_at)!,
  };
}

// ── Channel CRUD ─────────────────────────────────────

export async function createChannel(input: {
  instanceId: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
}): Promise<ChannelRecord> {
  const r = await getDbPool().query<ChannelRow>(
    `INSERT INTO channels (instance_id, name, visibility)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.instanceId, input.name, input.visibility],
  );
  if (!r.rows.length)
    throw new AppError(500, "DB_ERROR", "Failed to create channel");
  return mapChannel(r.rows[0]);
}

export async function findChannelById(
  instanceId: string,
  channelId: string,
): Promise<ChannelRecord | null> {
  const r = await getDbPool().query<ChannelRow>(
    `SELECT * FROM channels WHERE instance_id = $1 AND id = $2`,
    [instanceId, channelId],
  );
  return r.rows.length ? mapChannel(r.rows[0]) : null;
}

export async function listChannels(
  instanceId: string,
  limit: number,
  offset: number,
): Promise<{ items: ChannelRecord[]; total: number }> {
  const data = await getDbPool().query<ChannelRow>(
    `SELECT * FROM channels WHERE instance_id = $1 AND archived_at IS NULL
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [instanceId, limit, offset],
  );
  const count = await getDbPool().query<{ count: number }>(
    `SELECT COUNT(*) as count FROM channels WHERE instance_id = $1 AND archived_at IS NULL`,
    [instanceId],
  );
  return {
    items: data.rows.map(mapChannel),
    total: count.rows[0]?.count ?? 0,
  };
}

export async function updateChannel(
  instanceId: string,
  channelId: string,
  input: Partial<{
    name: string;
    visibility: "PUBLIC" | "PRIVATE";
    archivedAt: string;
  }>,
): Promise<ChannelRecord | null> {
  const updates: string[] = [];
  const values: any[] = [instanceId, channelId];
  let paramIdx = 3;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    values.push(input.name);
  }
  if (input.visibility !== undefined) {
    updates.push(`visibility = $${paramIdx++}`);
    values.push(input.visibility);
  }
  if (input.archivedAt !== undefined) {
    updates.push(`archived_at = $${paramIdx++}`);
    values.push(input.archivedAt);
  }

  if (!updates.length) return findChannelById(instanceId, channelId);

  const r = await getDbPool().query<ChannelRow>(
    `UPDATE channels SET ${updates.join(", ")}, updated_at = NOW()
     WHERE instance_id = $1 AND id = $2
     RETURNING *`,
    values,
  );
  return r.rows.length ? mapChannel(r.rows[0]) : null;
}

// ── Post CRUD ────────────────────────────────────────

export async function createPost(input: {
  instanceId: string;
  channelId: string;
  authorUserId: string;
  body: string;
}): Promise<PostRecord> {
  const r = await getDbPool().query<PostRow>(
    `INSERT INTO channel_posts (instance_id, channel_id, author_user_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.instanceId, input.channelId, input.authorUserId, input.body],
  );
  if (!r.rows.length)
    throw new AppError(500, "DB_ERROR", "Failed to create post");
  return mapPost(r.rows[0]);
}

export async function findPostById(
  instanceId: string,
  postId: string,
): Promise<PostRecord | null> {
  const r = await getDbPool().query<PostRow>(
    `SELECT * FROM channel_posts WHERE instance_id = $1 AND id = $2`,
    [instanceId, postId],
  );
  return r.rows.length ? mapPost(r.rows[0]) : null;
}

export async function listPosts(
  instanceId: string,
  channelId: string,
  limit: number,
  offset: number,
): Promise<{ items: PostRecord[]; total: number }> {
  const data = await getDbPool().query<PostRow>(
    `SELECT * FROM channel_posts 
     WHERE instance_id = $1 AND channel_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [instanceId, channelId, limit, offset],
  );
  const count = await getDbPool().query<{ count: number }>(
    `SELECT COUNT(*) as count FROM channel_posts 
     WHERE instance_id = $1 AND channel_id = $2 AND deleted_at IS NULL`,
    [instanceId, channelId],
  );
  return {
    items: data.rows.map(mapPost),
    total: count.rows[0]?.count ?? 0,
  };
}

export async function updatePost(
  instanceId: string,
  postId: string,
  input: Partial<{ body: string; deletedAt: string }>,
): Promise<PostRecord | null> {
  const updates: string[] = [];
  const values: any[] = [instanceId, postId];
  let paramIdx = 3;

  if (input.body !== undefined) {
    updates.push(`body = $${paramIdx++}`);
    values.push(input.body);
  }
  if (input.deletedAt !== undefined) {
    updates.push(`deleted_at = $${paramIdx++}`);
    values.push(input.deletedAt);
  }

  if (!updates.length) return findPostById(instanceId, postId);

  const r = await getDbPool().query<PostRow>(
    `UPDATE channel_posts SET ${updates.join(", ")}, updated_at = NOW()
     WHERE instance_id = $1 AND id = $2
     RETURNING *`,
    values,
  );
  return r.rows.length ? mapPost(r.rows[0]) : null;
}

// ── Comment CRUD ─────────────────────────────────────

export async function createComment(input: {
  instanceId: string;
  postId: string;
  authorUserId: string;
  body: string;
}): Promise<CommentRecord> {
  const r = await getDbPool().query<CommentRow>(
    `INSERT INTO channel_comments (instance_id, post_id, author_user_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.instanceId, input.postId, input.authorUserId, input.body],
  );
  if (!r.rows.length)
    throw new AppError(500, "DB_ERROR", "Failed to create comment");
  return mapComment(r.rows[0]);
}

export async function findCommentById(
  instanceId: string,
  commentId: string,
): Promise<CommentRecord | null> {
  const r = await getDbPool().query<CommentRow>(
    `SELECT * FROM channel_comments WHERE instance_id = $1 AND id = $2`,
    [instanceId, commentId],
  );
  return r.rows.length ? mapComment(r.rows[0]) : null;
}

export async function listComments(
  instanceId: string,
  postId: string,
  limit: number,
  offset: number,
): Promise<{ items: CommentRecord[]; total: number }> {
  const data = await getDbPool().query<CommentRow>(
    `SELECT * FROM channel_comments 
     WHERE instance_id = $1 AND post_id = $2 AND deleted_at IS NULL
     ORDER BY created_at ASC LIMIT $3 OFFSET $4`,
    [instanceId, postId, limit, offset],
  );
  const count = await getDbPool().query<{ count: number }>(
    `SELECT COUNT(*) as count FROM channel_comments 
     WHERE instance_id = $1 AND post_id = $2 AND deleted_at IS NULL`,
    [instanceId, postId],
  );
  return {
    items: data.rows.map(mapComment),
    total: count.rows[0]?.count ?? 0,
  };
}

export async function updateComment(
  instanceId: string,
  commentId: string,
  input: Partial<{ body: string; deletedAt: string }>,
): Promise<CommentRecord | null> {
  const updates: string[] = [];
  const values: any[] = [instanceId, commentId];
  let paramIdx = 3;

  if (input.body !== undefined) {
    updates.push(`body = $${paramIdx++}`);
    values.push(input.body);
  }
  if (input.deletedAt !== undefined) {
    updates.push(`deleted_at = $${paramIdx++}`);
    values.push(input.deletedAt);
  }

  if (!updates.length) return findCommentById(instanceId, commentId);

  const r = await getDbPool().query<CommentRow>(
    `UPDATE channel_comments SET ${updates.join(", ")}, updated_at = NOW()
     WHERE instance_id = $1 AND id = $2
     RETURNING *`,
    values,
  );
  return r.rows.length ? mapComment(r.rows[0]) : null;
}

// ── Moderation CRUD ──────────────────────────────────

export async function createModerationAction(input: {
  instanceId: string;
  channelId: string;
  action: string;
  targetUserId: string | null;
  targetContentType: string | null;
  targetContentId: string | null;
  reason: string | null;
  metadata: any;
  createdByUserId: string;
}): Promise<ModerationActionRecord> {
  const r = await getDbPool().query<ModerationActionRow>(
    `INSERT INTO moderation_actions 
       (instance_id, channel_id, action, target_user_id, target_content_type, 
        target_content_id, reason, metadata, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.instanceId,
      input.channelId,
      input.action,
      input.targetUserId,
      input.targetContentType,
      input.targetContentId,
      input.reason,
      JSON.stringify(input.metadata),
      input.createdByUserId,
    ],
  );
  if (!r.rows.length)
    throw new AppError(500, "DB_ERROR", "Failed to create moderation action");
  return mapModerationAction(r.rows[0]);
}
