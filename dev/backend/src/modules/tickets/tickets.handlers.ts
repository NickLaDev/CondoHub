import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError, Errors } from "../../core/contract/errors";
import { ROLES } from "../../core/contract/roles";
import { TICKET_STATUS } from "../../core/contract/enums";
import { assertSameUnit } from "../../core/contract/scopeHelpers";
import {
  parsePagination,
  respondPaginated,
} from "../../core/contract/pagination";
import { getAuditService } from "../../core/services/audit/audit.factory";
import { createAttachmentLink } from "../../core/db/repos/attachmentLinksRepo";
import * as repo from "./tickets.repo";
import { assertCanChangeTicketStatus } from "./tickets.authz";

// ── Schemas ──────────────────────────────────────────

const createSchema = z.object({
  category: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(1),
  unitId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
});

const msgSchema = z.object({
  body: z.string().min(1),
  attachmentId: z.string().uuid().optional(),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
});

// Status válidos para mudança manual (REABERTO usa endpoint /reopen)
const statusSchema = z.object({
  status: z.enum([
    TICKET_STATUS.ABERTO,
    TICKET_STATUS.EM_ANALISE,
    TICKET_STATUS.EM_EXECUCAO,
    TICKET_STATUS.RESOLVIDO,
    TICKET_STATUS.FECHADO,
  ]),
});

const reopenSchema = z.object({
  reason: z.string().optional(),
});

// ── Helpers ──────────────────────────────────────────

/** MVP: prazo = 3 dias a partir da criação */
function computeDueAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

function actorIsSindico(req: Request): boolean {
  return req.ctx.actor!.roles.includes(ROLES.SINDICO_ADMIN);
}

function actorIsManutencao(req: Request): boolean {
  return req.ctx.actor!.roles.includes(ROLES.FUNC_MANUTENCAO);
}

// ── Handlers ─────────────────────────────────────────

export async function createTicketHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createSchema.parse(req.body);
    const ctx = req.ctx;

    // Determinar unitId
    let unitId: string;
    if (actorIsSindico(req) && input.unitId) {
      unitId = input.unitId;
    } else {
      if (!ctx.actor!.unitId) throw Errors.forbidden();
      unitId = ctx.actor!.unitId;
    }

    // Criar ticket
    const ticket = await repo.createTicket({
      instanceId: ctx.instanceId,
      unitId,
      createdByUserId: ctx.actor!.userId,
      category: input.category ?? null,
      location: input.location ?? null,
      description: input.description,
      dueAt: computeDueAt(),
    });

    // Status history inicial
    await repo.createStatusHistory({
      instanceId: ctx.instanceId,
      ticketId: ticket.id,
      fromStatus: null,
      toStatus: TICKET_STATUS.ABERTO,
      changedByUserId: ctx.actor!.userId,
    });

    // Attachment links
    for (const aid of input.attachmentIds) {
      await createAttachmentLink({
        instanceId: ctx.instanceId,
        attachmentId: aid,
        targetType: "TICKET",
        targetId: ticket.id,
      });
    }

    // Audit
    await getAuditService().log(ctx, {
      action: "TICKET_CREATED",
      targetType: "ticket",
      targetId: ticket.id,
      metadata: { unitId },
    });

    res.status(201).json(ticket);
  } catch (e) {
    next(e);
  }
}

export async function listTicketsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;

    const filters: {
      status?: string;
      unitId?: string;
      assignedTo?: string;
      overdue?: boolean;
    } = {
      status: req.query.status as string | undefined,
      unitId: req.query.unitId as string | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      overdue: req.query.overdue === "true",
    };

    // Morador: forçar escopo unit (nunca vaza dados de outra unit)
    if (!actorIsSindico(req) && !actorIsManutencao(req)) {
      filters.unitId = req.ctx.actor!.unitId;
    }

    const result = await repo.listTickets(
      req.ctx.instanceId,
      filters,
      limit,
      offset,
    );
    respondPaginated(res, result.items, result.total, page, limit);
  } catch (e) {
    next(e);
  }
}

export async function getTicketHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ticket = await repo.findTicketById(req.ctx.instanceId, req.params.id);
    if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

    // Morador: verificar escopo unit
    if (!actorIsSindico(req) && !actorIsManutencao(req)) {
      assertSameUnit(ticket.unitId, req.ctx.actor!.unitId);
    }

    // Buscar dados relacionados
    const messages = await repo.listTicketMessages(
      req.ctx.instanceId,
      req.params.id,
    );
    const statusHistory = await repo.listStatusHistory(
      req.ctx.instanceId,
      req.params.id,
    );

    res.json({ ...ticket, messages, statusHistory });
  } catch (e) {
    next(e);
  }
}

export async function addMessageHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = msgSchema.parse(req.body);
    const ctx = req.ctx;

    const ticket = await repo.findTicketById(ctx.instanceId, req.params.id);
    if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

    // Verificar acesso
    if (!actorIsSindico(req) && !actorIsManutencao(req)) {
      assertSameUnit(ticket.unitId, ctx.actor!.unitId);
    }

    // ticket_messages NÃO tem coluna attachment_id — usar attachment_links
    const msg = await repo.createTicketMessage({
      instanceId: ctx.instanceId,
      ticketId: req.params.id,
      authorUserId: ctx.actor!.userId,
      body: input.body,
    });

    // Se tem attachment, linkar via attachment_links
    if (input.attachmentId) {
      await createAttachmentLink({
        instanceId: ctx.instanceId,
        attachmentId: input.attachmentId,
        targetType: "TICKET_MESSAGE",
        targetId: msg.id,
      });
    }

    await getAuditService().log(ctx, {
      action: "TICKET_MESSAGE_CREATED",
      targetType: "ticket_message",
      targetId: msg.id,
    });

    res.status(201).json(msg);
  } catch (e) {
    next(e);
  }
}

export async function assignTicketHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = assignSchema.parse(req.body);

    // Só síndico atribui
    if (!actorIsSindico(req)) throw Errors.forbidden();

    const ticket = await repo.findTicketById(req.ctx.instanceId, req.params.id);
    if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

    await repo.updateTicket(req.ctx.instanceId, req.params.id, {
      assignedToUserId: userId,
    });

    await getAuditService().log(req.ctx, {
      action: "TICKET_ASSIGNED",
      targetType: "ticket",
      targetId: req.params.id,
      metadata: { assignedTo: userId },
    });

    res.json({ ok: true, ticketId: req.params.id, assignedTo: userId });
  } catch (e) {
    next(e);
  }
}

export async function changeStatusHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status } = statusSchema.parse(req.body);
    const ctx = req.ctx;

    const ticket = await repo.findTicketById(ctx.instanceId, req.params.id);
    if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

    assertCanChangeTicketStatus(ctx.actor!, ticket.assignedToUserId);

    const fromStatus = ticket.status;

    // Se fechando/resolvendo, registrar closed_at
    const patch: { status: string; closedAt?: string } = { status };
    if (
      status === TICKET_STATUS.FECHADO ||
      status === TICKET_STATUS.RESOLVIDO
    ) {
      patch.closedAt = new Date().toISOString();
    }

    await repo.updateTicket(ctx.instanceId, req.params.id, patch);

    await repo.createStatusHistory({
      instanceId: ctx.instanceId,
      ticketId: req.params.id,
      fromStatus,
      toStatus: status,
      changedByUserId: ctx.actor!.userId,
    });

    await getAuditService().log(ctx, {
      action: "TICKET_STATUS_CHANGED",
      targetType: "ticket",
      targetId: req.params.id,
      metadata: { from: fromStatus, to: status },
    });

    res.json({
      ok: true,
      ticketId: req.params.id,
      from: fromStatus,
      to: status,
    });
  } catch (e) {
    next(e);
  }
}

export async function reopenTicketHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { reason } = reopenSchema.parse(req.body);
    const ctx = req.ctx;

    const ticket = await repo.findTicketById(ctx.instanceId, req.params.id);
    if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

    const fromStatus = ticket.status;

    await repo.updateTicket(ctx.instanceId, req.params.id, {
      status: TICKET_STATUS.REABERTO,
      reopenedAt: new Date().toISOString(),
    });

    await repo.createStatusHistory({
      instanceId: ctx.instanceId,
      ticketId: req.params.id,
      fromStatus,
      toStatus: TICKET_STATUS.REABERTO,
      changedByUserId: ctx.actor!.userId,
    });

    await getAuditService().log(ctx, {
      action: "TICKET_REOPENED",
      targetType: "ticket",
      targetId: req.params.id,
      metadata: { reason },
    });

    res.json({
      ok: true,
      ticketId: req.params.id,
      from: fromStatus,
      to: TICKET_STATUS.REABERTO,
    });
  } catch (e) {
    next(e);
  }
}
