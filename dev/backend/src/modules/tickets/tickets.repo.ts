import { AppError, Errors } from "../../core/contract/errors";
import { formatDbError, getDbPool } from "../../db/pool";

// ── Helpers ──────────────────────────────────────────

function toIso(v: Date | string | null): string | null {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return !isNaN(d.getTime()) ? d.toISOString() : String(v);
}

// ── Ticket ───────────────────────────────────────────

type TicketRow = {
  id: string;
  instance_id: string;
  unit_id: string;
  created_by_user_id: string;
  assigned_to_user_id: string | null;
  category: string | null;
  location: string | null;
  description: string;
  status: string;
  due_at: Date | string | null;
  closed_at: Date | string | null;
  reopened_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type TicketRecord = {
  id: string;
  instanceId: string;
  unitId: string;
  createdByUserId: string;
  assignedToUserId: string | null;
  category: string | null;
  location: string | null;
  description: string;
  status: string;
  dueAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapTicket(r: TicketRow): TicketRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    unitId: r.unit_id,
    createdByUserId: r.created_by_user_id,
    assignedToUserId: r.assigned_to_user_id,
    category: r.category,
    location: r.location,
    description: r.description,
    status: r.status,
    dueAt: toIso(r.due_at),
    closedAt: toIso(r.closed_at),
    reopenedAt: toIso(r.reopened_at),
    createdAt: toIso(r.created_at)!,
    updatedAt: toIso(r.updated_at)!,
  };
}

// ── Ticket Message ───────────────────────────────────
// Colunas do banco: id, instance_id, ticket_id, author_user_id, body, created_at
// NÃO tem attachment_id (usar attachment_links)

type MsgRow = {
  id: string;
  instance_id: string;
  ticket_id: string;
  author_user_id: string;
  body: string;
  created_at: Date | string;
};

export type TicketMsgRecord = {
  id: string;
  instanceId: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

function mapMsg(r: MsgRow): TicketMsgRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    ticketId: r.ticket_id,
    authorUserId: r.author_user_id,
    body: r.body,
    createdAt: toIso(r.created_at)!,
  };
}

// ── Status History ───────────────────────────────────
// Colunas: id, instance_id, ticket_id, from_status (nullable enum), to_status (enum), changed_by_user_id, created_at

type HistRow = {
  id: string;
  instance_id: string;
  ticket_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_user_id: string;
  created_at: Date | string;
};

export type StatusHistRecord = {
  id: string;
  instanceId: string;
  ticketId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string;
  createdAt: string;
};

function mapHist(r: HistRow): StatusHistRecord {
  return {
    id: r.id,
    instanceId: r.instance_id,
    ticketId: r.ticket_id,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    changedByUserId: r.changed_by_user_id,
    createdAt: toIso(r.created_at)!,
  };
}

// ── CRUD ─────────────────────────────────────────────

export async function createTicket(input: {
  instanceId: string;
  unitId: string;
  createdByUserId: string;
  category: string | null;
  location: string | null;
  description: string;
  dueAt: string;
}): Promise<TicketRecord> {
  try {
    const r = await getDbPool().query<TicketRow>(
      `INSERT INTO tickets
         (instance_id, unit_id, created_by_user_id, category, location, description, due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.instanceId,
        input.unitId,
        input.createdByUserId,
        input.category,
        input.location,
        input.description,
        input.dueAt,
      ],
    );
    return mapTicket(r.rows[0]);
  } catch (e) {
    console.error("[TICKETS] create failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create ticket");
  }
}

export async function findTicketById(
  instanceId: string,
  id: string,
): Promise<TicketRecord | null> {
  try {
    const r = await getDbPool().query<TicketRow>(
      `SELECT * FROM tickets WHERE instance_id = $1 AND id = $2`,
      [instanceId, id],
    );
    return r.rows[0] ? mapTicket(r.rows[0]) : null;
  } catch (e) {
    console.error("[TICKETS] findById failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to find ticket");
  }
}

export async function listTickets(
  instanceId: string,
  filters: {
    status?: string;
    unitId?: string;
    assignedTo?: string;
    overdue?: boolean;
  },
  limit: number,
  offset: number,
): Promise<{ items: TicketRecord[]; total: number }> {
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
    if (filters.assignedTo) {
      conds.push(`assigned_to_user_id = $${idx++}`);
      params.push(filters.assignedTo);
    }
    if (filters.overdue) {
      conds.push(`due_at < now() AND status NOT IN ('RESOLVIDO', 'FECHADO')`);
    }

    const where = conds.join(" AND ");

    const countRes = await getDbPool().query(
      `SELECT count(*)::int AS total FROM tickets WHERE ${where}`,
      params,
    );

    const dataRes = await getDbPool().query<TicketRow>(
      `SELECT * FROM tickets WHERE ${where}
       ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      items: dataRes.rows.map(mapTicket),
      total: countRes.rows[0].total,
    };
  } catch (e) {
    console.error("[TICKETS] list failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list tickets");
  }
}

export async function updateTicket(
  instanceId: string,
  id: string,
  patch: {
    status?: string;
    assignedToUserId?: string;
    closedAt?: string;
    reopenedAt?: string;
  },
): Promise<TicketRecord | null> {
  try {
    const sets: string[] = ["updated_at = now()"];
    const params: unknown[] = [instanceId, id];
    let idx = 3;

    if (patch.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(patch.status);
    }
    if (patch.assignedToUserId !== undefined) {
      sets.push(`assigned_to_user_id = $${idx++}`);
      params.push(patch.assignedToUserId);
    }
    if (patch.closedAt !== undefined) {
      sets.push(`closed_at = $${idx++}`);
      params.push(patch.closedAt);
    }
    if (patch.reopenedAt !== undefined) {
      sets.push(`reopened_at = $${idx++}`);
      params.push(patch.reopenedAt);
    }

    const r = await getDbPool().query<TicketRow>(
      `UPDATE tickets SET ${sets.join(", ")}
       WHERE instance_id = $1 AND id = $2
       RETURNING *`,
      params,
    );
    return r.rows[0] ? mapTicket(r.rows[0]) : null;
  } catch (e) {
    console.error("[TICKETS] update failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to update ticket");
  }
}

// ── Contadores (Dashboard) ───────────────────────────

export async function countByStatus(
  instanceId: string,
  status: string,
): Promise<number> {
  try {
    const r = await getDbPool().query(
      `SELECT count(*)::int AS total FROM tickets
       WHERE instance_id = $1 AND status = $2`,
      [instanceId, status],
    );
    return r.rows[0].total;
  } catch (e) {
    console.error("[TICKETS] countByStatus failed", formatDbError(e));
    return 0;
  }
}

export async function countOverdue(instanceId: string): Promise<number> {
  try {
    const r = await getDbPool().query(
      `SELECT count(*)::int AS total FROM tickets
       WHERE instance_id = $1
         AND due_at < now()
         AND status NOT IN ('RESOLVIDO', 'FECHADO')`,
      [instanceId],
    );
    return r.rows[0].total;
  } catch (e) {
    console.error("[TICKETS] countOverdue failed", formatDbError(e));
    return 0;
  }
}

// ── Messages ─────────────────────────────────────────

export async function createTicketMessage(input: {
  instanceId: string;
  ticketId: string;
  authorUserId: string;
  body: string;
}): Promise<TicketMsgRecord> {
  try {
    const r = await getDbPool().query<MsgRow>(
      `INSERT INTO ticket_messages
         (instance_id, ticket_id, author_user_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.instanceId, input.ticketId, input.authorUserId, input.body],
    );
    return mapMsg(r.rows[0]);
  } catch (e) {
    console.error("[TICKETS] createMessage failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create ticket message");
  }
}

export async function listTicketMessages(
  instanceId: string,
  ticketId: string,
): Promise<TicketMsgRecord[]> {
  try {
    const r = await getDbPool().query<MsgRow>(
      `SELECT * FROM ticket_messages
       WHERE instance_id = $1 AND ticket_id = $2
       ORDER BY created_at ASC`,
      [instanceId, ticketId],
    );
    return r.rows.map(mapMsg);
  } catch (e) {
    console.error("[TICKETS] listMessages failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list ticket messages");
  }
}

// ── Status History ───────────────────────────────────

export async function createStatusHistory(input: {
  instanceId: string;
  ticketId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string;
}): Promise<StatusHistRecord> {
  try {
    const r = await getDbPool().query<HistRow>(
      `INSERT INTO ticket_status_history
         (instance_id, ticket_id, from_status, to_status, changed_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.instanceId,
        input.ticketId,
        input.fromStatus,
        input.toStatus,
        input.changedByUserId,
      ],
    );
    return mapHist(r.rows[0]);
  } catch (e) {
    console.error("[TICKETS] createStatusHistory failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to create status history");
  }
}

export async function listStatusHistory(
  instanceId: string,
  ticketId: string,
): Promise<StatusHistRecord[]> {
  try {
    const r = await getDbPool().query<HistRow>(
      `SELECT * FROM ticket_status_history
       WHERE instance_id = $1 AND ticket_id = $2
       ORDER BY created_at ASC`,
      [instanceId, ticketId],
    );
    return r.rows.map(mapHist);
  } catch (e) {
    console.error("[TICKETS] listStatusHistory failed", formatDbError(e));
    if (e instanceof AppError) throw e;
    throw Errors.dbError("Failed to list status history");
  }
}
