import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError, Errors } from "../../core/contract/errors";
import { ROLES } from "../../core/contract/roles";
import { assertSameUnit } from "../../core/contract/scopeHelpers";
import {
  parsePagination,
  respondPaginated,
} from "../../core/contract/pagination";
import { getAuditService } from "../../core/services/audit/audit.factory";
import { createAttachmentLink } from "../../core/db/repos/attachmentLinksRepo";
import { StubQrService } from "../../core/services/qr/qr.stub";
import * as repo from "./deliveries.repo";

const qrService = new StubQrService();

// ── Schemas ──────────────────────────────────────────

const createSchema = z.object({
  unitId: z.string().uuid(),
  recipientName: z.string().optional(),
  attachmentIdEvidence: z.string().uuid().optional(),
});

const assignSchema = z.object({ userId: z.string().uuid() });

const completeSchema = z.object({
  qrToken: z.string().min(1),
  evidenceAttachmentId: z.string().uuid().optional(),
  deliveredToName: z.string().optional(),
  deliveredToUserId: z.string().uuid().optional(),
});

const failSchema = z.object({
  reason: z.string().min(1),
  evidenceAttachmentId: z.string().uuid().optional(),
});

// ── Helpers ──────────────────────────────────────────

function isSindico(req: Request) {
  return req.ctx.actor!.roles.includes(ROLES.SINDICO_ADMIN);
}
function isEntregas(req: Request) {
  return req.ctx.actor!.roles.includes(ROLES.FUNC_ENTREGAS);
}

async function addEvent(
  req: Request,
  deliveryId: string,
  eventType: string,
  fromStatus: string | null,
  toStatus: string | null,
  metadata: Record<string, unknown> = {},
) {
  await repo.createEvent({
    instanceId: req.ctx.instanceId,
    deliveryId,
    eventType,
    actorUserId: req.ctx.actor!.userId,
    fromStatus,
    toStatus,
    metadata,
  });
}

// ── Handlers ─────────────────────────────────────────

export async function createDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = createSchema.parse(req.body);

    const delivery = await repo.createDelivery({
      instanceId: req.ctx.instanceId,
      unitId: input.unitId,
      createdByUserId: req.ctx.actor!.userId,
      recipientName: input.recipientName ?? null,
      evidenceAttachmentId: input.attachmentIdEvidence ?? null,
    });

    await addEvent(req, delivery.id, "CREATED", null, "CHEGOU");

    if (input.attachmentIdEvidence) {
      await createAttachmentLink({
        instanceId: req.ctx.instanceId,
        attachmentId: input.attachmentIdEvidence,
        targetType: "DELIVERY",
        targetId: delivery.id,
      });
    }

    await getAuditService().log(req.ctx, {
      action: "DELIVERY_CREATED",
      targetType: "delivery",
      targetId: delivery.id,
      metadata: { unitId: input.unitId },
    });

    res.status(201).json(delivery);
  } catch (e) {
    next(e);
  }
}

export async function listDeliveriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;
    const filters: { status?: string; unitId?: string } = {
      status: req.query.status as string | undefined,
      unitId: req.query.unitId as string | undefined,
    };

    if (!isSindico(req) && !isEntregas(req)) {
      filters.unitId = req.ctx.actor!.unitId;
    }

    const result = await repo.listDeliveries(
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

export async function getDeliveryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const d = await repo.findDeliveryById(req.ctx.instanceId, req.params.id);
    if (!d) throw new AppError(404, "NOT_FOUND", "Delivery not found");

    if (!isSindico(req) && !isEntregas(req)) {
      assertSameUnit(d.unitId, req.ctx.actor!.unitId);
    }

    const events = await repo.listEvents(req.ctx.instanceId, req.params.id);
    res.json({ ...d, events });
  } catch (e) {
    next(e);
  }
}

export async function queueHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const items = await repo.queueForUser(
      req.ctx.instanceId,
      req.ctx.actor!.userId,
    );
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

export async function assignDeliveryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId } = assignSchema.parse(req.body);
    const d = await repo.findDeliveryById(req.ctx.instanceId, req.params.id);
    if (!d) throw new AppError(404, "NOT_FOUND", "Delivery not found");

    await repo.updateDelivery(req.ctx.instanceId, req.params.id, {
      assignedToUserId: userId,
    });

    await addEvent(req, req.params.id, "ASSIGNED", null, null, { userId });

    await getAuditService().log(req.ctx, {
      action: "DELIVERY_ASSIGNED",
      targetType: "delivery",
      targetId: req.params.id,
      metadata: { assignedTo: userId },
    });

    res.json({ ok: true, deliveryId: req.params.id, assignedTo: userId });
  } catch (e) {
    next(e);
  }
}

export async function completeDeliveryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = completeSchema.parse(req.body);
    const d = await repo.findDeliveryById(req.ctx.instanceId, req.params.id);
    if (!d) throw new AppError(404, "NOT_FOUND", "Delivery not found");

    // 1) Verificar QR
    const qrResult = await qrService.verify(req.ctx, { token: input.qrToken });

    if (!qrResult.ok) {
      await addEvent(req, req.params.id, "QR_INVALID", d.status, d.status, {
        reason: qrResult.reason,
      });
      await getAuditService().log(req.ctx, {
        action: "DELIVERY_QR_INVALID",
        targetType: "delivery",
        targetId: req.params.id,
        metadata: { reason: qrResult.reason },
      });
      throw new AppError(400, "QR_INVALID", "Invalid QR token");
    }

    // 2) Verificar unit
    if (qrResult.unitId !== d.unitId) {
      await addEvent(req, req.params.id, "QR_MISMATCH", d.status, d.status, {
        expected: d.unitId,
        got: qrResult.unitId,
      });
      await getAuditService().log(req.ctx, {
        action: "DELIVERY_QR_MISMATCH",
        targetType: "delivery",
        targetId: req.params.id,
        metadata: { expected: d.unitId, got: qrResult.unitId },
      });
      throw new AppError(400, "QR_MISMATCH", "QR unit does not match");
    }

    // 3) Sucesso
    const fromStatus = d.status;
    await repo.updateDelivery(req.ctx.instanceId, req.params.id, {
      status: "ENTREGUE",
      deliveredToName: input.deliveredToName ?? null,
      deliveredToUserId: input.deliveredToUserId ?? null,
      evidenceAttachmentId:
        input.evidenceAttachmentId ?? d.evidenceAttachmentId,
    });

    await addEvent(req, req.params.id, "DELIVERED", fromStatus, "ENTREGUE", {
      deliveredToName: input.deliveredToName,
    });

    if (input.evidenceAttachmentId) {
      await createAttachmentLink({
        instanceId: req.ctx.instanceId,
        attachmentId: input.evidenceAttachmentId,
        targetType: "DELIVERY",
        targetId: req.params.id,
      });
    }

    await getAuditService().log(req.ctx, {
      action: "DELIVERY_DELIVERED",
      targetType: "delivery",
      targetId: req.params.id,
      metadata: { unitId: d.unitId },
    });

    res.json({ ok: true, deliveryId: req.params.id, status: "ENTREGUE" });
  } catch (e) {
    next(e);
  }
}

export async function failDeliveryHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = failSchema.parse(req.body);
    if (!isEntregas(req) && !isSindico(req)) throw Errors.forbidden();

    const d = await repo.findDeliveryById(req.ctx.instanceId, req.params.id);
    if (!d) throw new AppError(404, "NOT_FOUND", "Delivery not found");

    const fromStatus = d.status;
    await repo.updateDelivery(req.ctx.instanceId, req.params.id, {
      status: "NAO_ENTREGUE",
    });

    await addEvent(req, req.params.id, "FAILED", fromStatus, "NAO_ENTREGUE", {
      reason: input.reason,
    });

    if (input.evidenceAttachmentId) {
      await createAttachmentLink({
        instanceId: req.ctx.instanceId,
        attachmentId: input.evidenceAttachmentId,
        targetType: "DELIVERY",
        targetId: req.params.id,
      });
    }

    await getAuditService().log(req.ctx, {
      action: "DELIVERY_FAILED",
      targetType: "delivery",
      targetId: req.params.id,
      metadata: { reason: input.reason },
    });

    res.json({ ok: true, deliveryId: req.params.id, status: "NAO_ENTREGUE" });
  } catch (e) {
    next(e);
  }
}

// ── Turnos ───────────────────────────────────────────

export async function startTurnHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const existing = await repo.findOpenTurn(
      req.ctx.instanceId,
      req.ctx.actor!.userId,
    );
    if (existing)
      throw new AppError(409, "CONFLICT", "You already have an open turn");

    const turn = await repo.createTurn({
      instanceId: req.ctx.instanceId,
      staffUserId: req.ctx.actor!.userId,
    });

    await getAuditService().log(req.ctx, {
      action: "DELIVERY_TURN_STARTED",
      targetType: "delivery_turn",
      targetId: turn.id,
    });

    res.status(201).json(turn);
  } catch (e) {
    next(e);
  }
}

export async function endTurnHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const open = await repo.findOpenTurn(
      req.ctx.instanceId,
      req.ctx.actor!.userId,
    );
    if (!open) throw new AppError(404, "NOT_FOUND", "No open turn found");

    const ended = await repo.endTurn(req.ctx.instanceId, open.id);

    await getAuditService().log(req.ctx, {
      action: "DELIVERY_TURN_ENDED",
      targetType: "delivery_turn",
      targetId: open.id,
    });

    res.json(ended);
  } catch (e) {
    next(e);
  }
}
