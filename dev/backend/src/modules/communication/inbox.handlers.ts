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
import * as repo from "./inbox.repo";

const createMsgSchema = z.object({
  threadId: z.string().uuid().optional(),
  body: z.string().min(1),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
});

const updateStatusSchema = z.object({
  threadId: z.string().uuid(),
  status: z.enum(["ABERTO", "EM_ATENDIMENTO", "RESOLVIDO", "ARQUIVADO"]),
});

function isSindico(req: Request): boolean {
  return req.ctx.actor!.roles.includes(ROLES.SINDICO_ADMIN);
}

export async function getInboxHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ctx = req.ctx;
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;

    if (isSindico(req)) {
      const result = await repo.listThreads(
        ctx.instanceId,
        {
          status: req.query.status as string | undefined,
          unitId: req.query.unitId as string | undefined,
        },
        limit,
        offset,
      );
      respondPaginated(res, result.items, result.total, page, limit);
      return;
    }

    if (!ctx.actor!.unitId) throw Errors.forbidden();
    const thread = await repo.findThreadByUnit(
      ctx.instanceId,
      ctx.actor!.unitId,
    );
    if (!thread) {
      respondPaginated(res, [], 0, page, limit);
      return;
    }
    const messages = await repo.listMessages(ctx.instanceId, thread.id);
    respondPaginated(res, [{ ...thread, messages }], 1, page, limit);
  } catch (e) {
    next(e);
  }
}

export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createMsgSchema.parse(req.body);
    const ctx = req.ctx;
    let threadId = input.threadId;

    if (!threadId) {
      if (!ctx.actor!.unitId) throw Errors.forbidden();
      const existing = await repo.findThreadByUnit(
        ctx.instanceId,
        ctx.actor!.unitId,
      );
      if (existing) {
        threadId = existing.id;
      } else {
        const thread = await repo.createThread({
          instanceId: ctx.instanceId,
          unitId: ctx.actor!.unitId,
        });
        threadId = thread.id;
      }
    } else {
      const thread = await repo.findThreadById(ctx.instanceId, threadId);
      if (!thread) throw new AppError(404, "NOT_FOUND", "Thread not found");
      if (!isSindico(req)) assertSameUnit(thread.unitId, ctx.actor!.unitId);
    }

    const msg = await repo.createMessage({
      instanceId: ctx.instanceId,
      threadId,
      authorUserId: ctx.actor!.userId,
      body: input.body,
    });
    await repo.updateThread(ctx.instanceId, threadId, {
      lastMessageAt: new Date().toISOString(),
    });

    for (const aid of input.attachmentIds) {
      await createAttachmentLink({
        instanceId: ctx.instanceId,
        attachmentId: aid,
        targetType: "INBOX_MESSAGE",
        targetId: msg.id,
      });
    }

    await getAuditService().log(ctx, {
      action: "INBOX_MESSAGE_CREATED",
      targetType: "inbox_message",
      targetId: msg.id,
    });
    res.status(201).json(msg);
  } catch (e) {
    next(e);
  }
}

export async function updateStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateStatusSchema.parse(req.body);
    const thread = await repo.findThreadById(
      req.ctx.instanceId,
      input.threadId,
    );
    if (!thread) throw new AppError(404, "NOT_FOUND", "Thread not found");
    await repo.updateThread(req.ctx.instanceId, input.threadId, {
      status: input.status,
    });
    await getAuditService().log(req.ctx, {
      action: "INBOX_STATUS_CHANGED",
      targetType: "inbox_thread",
      targetId: input.threadId,
      metadata: { newStatus: input.status },
    });
    res.json({ ok: true, threadId: input.threadId, status: input.status });
  } catch (e) {
    next(e);
  }
}
