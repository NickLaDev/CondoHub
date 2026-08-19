import { AppError, Errors } from "../../core/contract/errors";
import { formatDbError, getDbPool } from "../../db/pool";

function toIso(v: Date | string | null): string | null {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return !isNaN(d.getTime()) ? d.toISOString() : String(v);
}

// ── Thread ──────────────────────────────────────────
// Colunas: id, instance_id, unit_id, status (inbox_status enum),
//          last_message_at, created_at, updated_at

type ThreadRow = {
  id: string;
  instance_id: string;
  unit_id: string;
  status: string;
  last_message_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type ThreadRecord = {
  id: string;
  instanceId: string;
  unitId: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapThread(r: ThreadRow): ThreadRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    unitId: r.unit_id,
    status: r.status,
    lastMessageAt: toIso(r.last_message_at),
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Message ─────────────────────────────────────────
// Colunas: id, instance_id, thread_id, author_user_id, body, created_at

type MsgRow = {
  id: string;
  instance_id: string;
  thread_id: string;
  author_user_id: string;
  body: string;
  created_at: Date | string;
};

export type MsgRecord = {
  id: string;
  instanceId: string;
  threadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

function mapMsg(r: MsgRow): MsgRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    threadId: r.thread_id,
    authorUserId: r.author_user_id,
    body: r.body,
    createdAt: toIso(r.created_at)!,
  };
}

// ── CRUD ────────────────────────────────────────────

export async function createThread(input: {
  instanceId: string;
  unitId: string;
}): Promise<ThreadRecord> {
  try {
    const r = await getDbPool().query<ThreadRow>(
      `INSERT INTO inbox_threads (instance_id, unit_id) VALUES ($1, $2) RETURNING *`,
      [input.instanceId, input.unitId],
    );
    return mapThread(r.rows[0]);
  } catch (e) {
    console.error("[INBOX] createThread failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create thread");
  }
}

export async function findThreadById(
  instanceId: string,
  id: string,
): Promise<ThreadRecord | null> {
  try {
    const r = await getDbPool().query<ThreadRow>(
      `SELECT * FROM inbox_threads WHERE instance_id = $1 AND id = $2`,
      [instanceId, id],
    );
    return r.rows[0] ? mapThread(r.rows[0]) : null;
  } catch (e) {
    console.error("[INBOX] findThreadById failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find thread");
  }
}

export async function findThreadByUnit(
  instanceId: string,
  unitId: string,
): Promise<ThreadRecord | null> {
  try {
    const r = await getDbPool().query<ThreadRow>(
      `SELECT * FROM inbox_threads WHERE instance_id = $1 AND unit_id = $2`,
      [instanceId, unitId],
    );
    return r.rows[0] ? mapThread(r.rows[0]) : null;
  } catch (e) {
    console.error("[INBOX] findThreadByUnit failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find thread by unit");
  }
}

export async function listThreads(
  instanceId: string,
  filters: { status?: string; unitId?: string },
  limit: number,
  offset: number,
): Promise<{ items: ThreadRecord[]; total: number }> {
  try {
    const conds: string[] = ["instance_id = $1"];
    const params: unknown[] = [instanceId];
    let idx = 2;
    if (filters.status) {
      conds.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.unitId) {
      conds.push(`unit_id = $${idx++}`);
      params.push(filters.unitId);
    }
    const where = conds.join(" AND ");
    const cnt = await getDbPool().query(
      `SELECT count(*)::int AS total FROM inbox_threads WHERE ${where}`,
      params,
    );
    const data = await getDbPool().query<ThreadRow>(
      `SELECT * FROM inbox_threads WHERE ${where} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );
    return { items: data.rows.map(mapThread), total: cnt.rows[0].total };
  } catch (e) {
    console.error("[INBOX] listThreads failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list threads");
  }
}

export async function updateThread(
  instanceId: string,
  id: string,
  patch: {
    status?: string;
    lastMessageAt?: string;
  },
): Promise<ThreadRecord | null> {
  try {
    const sets: string[] = ["updated_at = now()"];
    const params: unknown[] = [instanceId, id];
    let idx = 3;
    if (patch.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(patch.status);
    }
    if (patch.lastMessageAt !== undefined) {
      sets.push(`last_message_at = $${idx++}`);
      params.push(patch.lastMessageAt);
    }
    const r = await getDbPool().query<ThreadRow>(
      `UPDATE inbox_threads SET ${sets.join(", ")} WHERE instance_id = $1 AND id = $2 RETURNING *`,
      params,
    );
    return r.rows[0] ? mapThread(r.rows[0]) : null;
  } catch (e) {
    console.error("[INBOX] updateThread failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to update thread");
  }
}

export async function createMessage(input: {
  instanceId: string;
  threadId: string;
  authorUserId: string;
  body: string;
}): Promise<MsgRecord> {
  try {
    const r = await getDbPool().query<MsgRow>(
      `INSERT INTO inbox_messages (instance_id, thread_id, author_user_id, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.instanceId, input.threadId, input.authorUserId, input.body],
    );
    return mapMsg(r.rows[0]);
  } catch (e) {
    console.error("[INBOX] createMessage failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create message");
  }
}

export async function listMessages(
  instanceId: string,
  threadId: string,
): Promise<MsgRecord[]> {
  try {
    const r = await getDbPool().query<MsgRow>(
      `SELECT * FROM inbox_messages WHERE instance_id = $1 AND thread_id = $2 ORDER BY created_at ASC`,
      [instanceId, threadId],
    );
    return r.rows.map(mapMsg);
  } catch (e) {
    console.error("[INBOX] listMessages failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list messages");
  }
}
