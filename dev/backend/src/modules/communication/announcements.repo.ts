import { AppError, Errors } from "../../core/contract/errors";
import { formatDbError, getDbPool } from "../../db/pool";

function toIso(v: Date | string | null): string | null {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return !isNaN(d.getTime()) ? d.toISOString() : String(v);
}

// ── Announcement ────────────────────────────────────
// Colunas: id, instance_id, created_by_user_id, title, body,
//          require_ack, archived_at, created_at, updated_at

type AnnouncementRow = {
  id: string;
  instance_id: string;
  created_by_user_id: string;
  title: string;
  body: string;
  require_ack: boolean;
  archived_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type AnnouncementRecord = {
  id: string;
  instanceId: string;
  createdByUserId: string;
  title: string;
  body: string;
  requireAck: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapAnnouncement(r: AnnouncementRow): AnnouncementRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    createdByUserId: r.created_by_user_id,
    title: r.title,
    body: r.body,
    requireAck: r.require_ack,
    archivedAt: toIso(r.archived_at),
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Ack ─────────────────────────────────────────────
// Colunas: id, instance_id, announcement_id, unit_id, user_id, ack_at

type AckRow = {
  id: string;
  instance_id: string;
  announcement_id: string;
  unit_id: string;
  user_id: string;
  ack_at: Date | string;
};

export type AckRecord = {
  id: string;
  instanceId: string;
  announcementId: string;
  unitId: string;
  userId: string;
  ackAt: string;
};

function mapAck(r: AckRow): AckRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    announcementId: r.announcement_id,
    unitId: r.unit_id,
    userId: r.user_id,
    ackAt: toIso(r.ack_at)!,
  };
}

// ── CRUD ────────────────────────────────────────────

export async function createAnnouncement(input: {
  instanceId: string;
  createdByUserId: string;
  title: string;
  body: string;
  requireAck: boolean;
}): Promise<AnnouncementRecord> {
  try {
    const r = await getDbPool().query<AnnouncementRow>(
      `INSERT INTO announcements
         (instance_id, created_by_user_id, title, body, require_ack)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.instanceId,
        input.createdByUserId,
        input.title,
        input.body,
        input.requireAck,
      ],
    );
    return mapAnnouncement(r.rows[0]);
  } catch (e) {
    console.error("[ANNOUNCEMENTS] create failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create announcement");
  }
}

export async function findAnnouncementById(
  instanceId: string,
  id: string,
): Promise<AnnouncementRecord | null> {
  try {
    const r = await getDbPool().query<AnnouncementRow>(
      `SELECT * FROM announcements WHERE instance_id = $1 AND id = $2`,
      [instanceId, id],
    );
    return r.rows[0] ? mapAnnouncement(r.rows[0]) : null;
  } catch (e) {
    console.error("[ANNOUNCEMENTS] findById failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find announcement");
  }
}

export async function listAnnouncements(
  instanceId: string,
  filters: { archived?: boolean; requireAck?: boolean },
  limit: number,
  offset: number,
): Promise<{ items: AnnouncementRecord[]; total: number }> {
  try {
    const conds: string[] = ["instance_id = $1"];
    const params: unknown[] = [instanceId];
    let idx = 2;

    if (filters.archived === true) conds.push("archived_at IS NOT NULL");
    else if (filters.archived === false) conds.push("archived_at IS NULL");

    if (filters.requireAck !== undefined) {
      conds.push(`require_ack = $${idx++}`);
      params.push(filters.requireAck);
    }

    const where = conds.join(" AND ");

    const countRes = await getDbPool().query(
      `SELECT count(*)::int AS total FROM announcements WHERE ${where}`,
      params,
    );
    const dataRes = await getDbPool().query<AnnouncementRow>(
      `SELECT * FROM announcements WHERE ${where}
       ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      items: dataRes.rows.map(mapAnnouncement),
      total: countRes.rows[0].total,
    };
  } catch (e) {
    console.error("[ANNOUNCEMENTS] list failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list announcements");
  }
}

export async function updateAnnouncement(
  instanceId: string,
  id: string,
  patch: {
    title?: string;
    body?: string;
    requireAck?: boolean;
    archivedAt?: string;
  },
): Promise<AnnouncementRecord | null> {
  try {
    const sets: string[] = ["updated_at = now()"];
    const params: unknown[] = [instanceId, id];
    let idx = 3;

    if (patch.title !== undefined) {
      sets.push(`title = $${idx++}`);
      params.push(patch.title);
    }
    if (patch.body !== undefined) {
      sets.push(`body = $${idx++}`);
      params.push(patch.body);
    }
    if (patch.requireAck !== undefined) {
      sets.push(`require_ack = $${idx++}`);
      params.push(patch.requireAck);
    }
    if (patch.archivedAt !== undefined) {
      sets.push(`archived_at = $${idx++}`);
      params.push(patch.archivedAt);
    }

    const r = await getDbPool().query<AnnouncementRow>(
      `UPDATE announcements SET ${sets.join(", ")}
       WHERE instance_id = $1 AND id = $2
       RETURNING *`,
      params,
    );
    return r.rows[0] ? mapAnnouncement(r.rows[0]) : null;
  } catch (e) {
    console.error("[ANNOUNCEMENTS] update failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to update announcement");
  }
}

// ── Ack ─────────────────────────────────────────────

export async function findAck(
  instanceId: string,
  announcementId: string,
  userId: string,
): Promise<AckRecord | null> {
  try {
    const r = await getDbPool().query<AckRow>(
      `SELECT * FROM announcement_acks
       WHERE instance_id = $1 AND announcement_id = $2 AND user_id = $3`,
      [instanceId, announcementId, userId],
    );
    return r.rows[0] ? mapAck(r.rows[0]) : null;
  } catch (e) {
    console.error("[ANNOUNCEMENTS] findAck failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find ack");
  }
}

export async function createAck(input: {
  instanceId: string;
  announcementId: string;
  unitId: string;
  userId: string;
}): Promise<AckRecord> {
  try {
    const r = await getDbPool().query<AckRow>(
      `INSERT INTO announcement_acks
         (instance_id, announcement_id, unit_id, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.instanceId, input.announcementId, input.unitId, input.userId],
    );
    return mapAck(r.rows[0]);
  } catch (e) {
    console.error("[ANNOUNCEMENTS] createAck failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create ack");
  }
}

export async function countPendingAcks(instanceId: string): Promise<number> {
  try {
    const r = await getDbPool().query(
      `SELECT count(*)::int AS total FROM announcements
       WHERE instance_id = $1 AND require_ack = true AND archived_at IS NULL`,
      [instanceId],
    );
    return r.rows[0].total;
  } catch (e) {
    console.error("[ANNOUNCEMENTS] countPendingAcks failed", formatDbError(e));
    return 0;
  }
}
