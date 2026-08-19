import { AppError, Errors } from "../../core/contract/errors";
import { formatDbError, getDbPool } from "../../db/pool";

function toIso(v: Date | string | null): string | null {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return !isNaN(d.getTime()) ? d.toISOString() : String(v);
}

// ── Delivery ─────────────────────────────────────────

type DeliveryRow = {
  id: string;
  instance_id: string;
  unit_id: string;
  created_by_user_id: string;
  assigned_to_user_id: string | null;
  recipient_name: string | null;
  status: string;
  delivered_to_name: string | null;
  delivered_to_user_id: string | null;
  evidence_attachment_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type DeliveryRecord = {
  id: string;
  instanceId: string;
  unitId: string;
  createdByUserId: string;
  assignedToUserId: string | null;
  recipientName: string | null;
  status: string;
  deliveredToName: string | null;
  deliveredToUserId: string | null;
  evidenceAttachmentId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapDelivery(r: DeliveryRow): DeliveryRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    unitId: r.unit_id,
    createdByUserId: r.created_by_user_id,
    assignedToUserId: r.assigned_to_user_id,
    recipientName: r.recipient_name,
    status: r.status,
    deliveredToName: r.delivered_to_name,
    deliveredToUserId: r.delivered_to_user_id,
    evidenceAttachmentId: r.evidence_attachment_id,
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Delivery Events (event_type, actor_user_id, from/to_status) ──

type EventRow = {
  id: string;
  instance_id: string;
  delivery_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date | string;
};

export type EventRecord = {
  id: string;
  instanceId: string;
  deliveryId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function mapEvent(r: EventRow): EventRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    deliveryId: r.delivery_id,
    eventType: r.event_type,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    actorUserId: r.actor_user_id,
    metadata: r.metadata ?? {},
    createdAt: toIso(r.created_at)!,
  };
}

// ── Delivery Turns (staff_user_id) ───────────────────

type TurnRow = {
  id: string;
  instance_id: string;
  staff_user_id: string;
  started_at: Date | string;
  ended_at: Date | string | null;
  created_at: Date | string;
};

export type TurnRecord = {
  id: string;
  instanceId: string;
  staffUserId: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

function mapTurn(r: TurnRow): TurnRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    staffUserId: r.staff_user_id,
    startedAt: toIso(r.started_at)!,
    endedAt: toIso(r.ended_at),
    createdAt: toIso(r.created_at)!,
  };
}

// ── Deliveries CRUD ──────────────────────────────────

export async function createDelivery(input: {
  instanceId: string;
  unitId: string;
  createdByUserId: string;
  recipientName: string | null;
  evidenceAttachmentId: string | null;
}): Promise<DeliveryRecord> {
  try {
    const r = await getDbPool().query<DeliveryRow>(
      `INSERT INTO deliveries
         (instance_id, unit_id, created_by_user_id, recipient_name, evidence_attachment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.instanceId,
        input.unitId,
        input.createdByUserId,
        input.recipientName,
        input.evidenceAttachmentId,
      ],
    );
    return mapDelivery(r.rows[0]);
  } catch (e) {
    console.error("[DELIVERIES] create failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create delivery");
  }
}

export async function findDeliveryById(
  instanceId: string,
  id: string,
): Promise<DeliveryRecord | null> {
  try {
    const r = await getDbPool().query<DeliveryRow>(
      `SELECT * FROM deliveries WHERE instance_id = $1 AND id = $2`,
      [instanceId, id],
    );
    return r.rows[0] ? mapDelivery(r.rows[0]) : null;
  } catch (e) {
    console.error("[DELIVERIES] findById failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find delivery");
  }
}

export async function listDeliveries(
  instanceId: string,
  filters: { status?: string; unitId?: string },
  limit: number,
  offset: number,
): Promise<{ items: DeliveryRecord[]; total: number }> {
  try {
    const conds: string[] = ["instance_id = $1"];
    const params: unknown[] = [instanceId];
    let idx = 2;

    if (filters.status) {
      conds.push(`status = $${idx++}::delivery_status`);
      params.push(filters.status);
    }
    if (filters.unitId) {
      conds.push(`unit_id = $${idx++}`);
      params.push(filters.unitId);
    }

    const where = conds.join(" AND ");
    const cnt = await getDbPool().query(
      `SELECT count(*)::int AS total FROM deliveries WHERE ${where}`,
      params,
    );
    const data = await getDbPool().query<DeliveryRow>(
      `SELECT * FROM deliveries WHERE ${where}
       ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );
    return { items: data.rows.map(mapDelivery), total: cnt.rows[0].total };
  } catch (e) {
    console.error("[DELIVERIES] list failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list deliveries");
  }
}

export async function queueForUser(
  instanceId: string,
  userId: string,
): Promise<DeliveryRecord[]> {
  try {
    const r = await getDbPool().query<DeliveryRow>(
      `SELECT * FROM deliveries
       WHERE instance_id = $1
         AND assigned_to_user_id = $2
         AND status IN ('CHEGOU', 'EM_DISTRIBUICAO')
       ORDER BY created_at ASC`,
      [instanceId, userId],
    );
    return r.rows.map(mapDelivery);
  } catch (e) {
    console.error("[DELIVERIES] queue failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to get queue");
  }
}

export async function updateDelivery(
  instanceId: string,
  id: string,
  patch: {
    status?: string;
    assignedToUserId?: string;
    deliveredToName?: string | null;
    deliveredToUserId?: string | null;
    evidenceAttachmentId?: string | null;
  },
): Promise<DeliveryRecord | null> {
  try {
    const sets: string[] = ["updated_at = now()"];
    const params: unknown[] = [instanceId, id];
    let idx = 3;

    if (patch.status !== undefined) {
      sets.push(`status = $${idx++}::delivery_status`);
      params.push(patch.status);
    }
    if (patch.assignedToUserId !== undefined) {
      sets.push(`assigned_to_user_id = $${idx++}`);
      params.push(patch.assignedToUserId);
    }
    if (patch.deliveredToName !== undefined) {
      sets.push(`delivered_to_name = $${idx++}`);
      params.push(patch.deliveredToName);
    }
    if (patch.deliveredToUserId !== undefined) {
      sets.push(`delivered_to_user_id = $${idx++}`);
      params.push(patch.deliveredToUserId);
    }
    if (patch.evidenceAttachmentId !== undefined) {
      sets.push(`evidence_attachment_id = $${idx++}`);
      params.push(patch.evidenceAttachmentId);
    }

    const r = await getDbPool().query<DeliveryRow>(
      `UPDATE deliveries SET ${sets.join(", ")}
       WHERE instance_id = $1 AND id = $2
       RETURNING *`,
      params,
    );
    return r.rows[0] ? mapDelivery(r.rows[0]) : null;
  } catch (e) {
    console.error("[DELIVERIES] update failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to update delivery");
  }
}

export async function countByStatus(
  instanceId: string,
  status: string,
): Promise<number> {
  try {
    const r = await getDbPool().query(
      `SELECT count(*)::int AS total FROM deliveries
       WHERE instance_id = $1 AND status = $2::delivery_status`,
      [instanceId, status],
    );
    return r.rows[0].total;
  } catch (e) {
    console.error("[DELIVERIES] countByStatus failed", formatDbError(e));
    return 0;
  }
}

// ── Events (event_type, actor_user_id, from/to_status) ──

export async function createEvent(input: {
  instanceId: string;
  deliveryId: string;
  eventType: string;
  actorUserId: string;
  fromStatus: string | null;
  toStatus: string | null;
  metadata: Record<string, unknown>;
}): Promise<EventRecord> {
  try {
    const r = await getDbPool().query<EventRow>(
      `INSERT INTO delivery_events
         (instance_id, delivery_id, event_type, actor_user_id,
          from_status, to_status, metadata)
       VALUES ($1, $2, $3, $4, $5::delivery_status, $6::delivery_status, $7)
       RETURNING *`,
      [
        input.instanceId,
        input.deliveryId,
        input.eventType,
        input.actorUserId,
        input.fromStatus,
        input.toStatus,
        JSON.stringify(input.metadata),
      ],
    );
    return mapEvent(r.rows[0]);
  } catch (e) {
    console.error("[DELIVERIES] createEvent failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create delivery event");
  }
}

export async function listEvents(
  instanceId: string,
  deliveryId: string,
): Promise<EventRecord[]> {
  try {
    const r = await getDbPool().query<EventRow>(
      `SELECT * FROM delivery_events
       WHERE instance_id = $1 AND delivery_id = $2
       ORDER BY created_at ASC`,
      [instanceId, deliveryId],
    );
    return r.rows.map(mapEvent);
  } catch (e) {
    console.error("[DELIVERIES] listEvents failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list delivery events");
  }
}

// ── Turns (staff_user_id) ────────────────────────────

export async function findOpenTurn(
  instanceId: string,
  userId: string,
): Promise<TurnRecord | null> {
  try {
    const r = await getDbPool().query<TurnRow>(
      `SELECT * FROM delivery_turns
       WHERE instance_id = $1 AND staff_user_id = $2 AND ended_at IS NULL`,
      [instanceId, userId],
    );
    return r.rows[0] ? mapTurn(r.rows[0]) : null;
  } catch (e) {
    console.error("[DELIVERIES] findOpenTurn failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find open turn");
  }
}

export async function createTurn(input: {
  instanceId: string;
  staffUserId: string;
}): Promise<TurnRecord> {
  try {
    const r = await getDbPool().query<TurnRow>(
      `INSERT INTO delivery_turns (instance_id, staff_user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [input.instanceId, input.staffUserId],
    );
    return mapTurn(r.rows[0]);
  } catch (e) {
    console.error("[DELIVERIES] createTurn failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create turn");
  }
}

export async function endTurn(
  instanceId: string,
  turnId: string,
): Promise<TurnRecord | null> {
  try {
    const r = await getDbPool().query<TurnRow>(
      `UPDATE delivery_turns SET ended_at = now()
       WHERE instance_id = $1 AND id = $2
       RETURNING *`,
      [instanceId, turnId],
    );
    return r.rows[0] ? mapTurn(r.rows[0]) : null;
  } catch (e) {
    console.error("[DELIVERIES] endTurn failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to end turn");
  }
}
