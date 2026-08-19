import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError, Errors } from "../../core/contract/errors";
import {
  parsePagination,
  respondPaginated,
} from "../../core/contract/pagination";
import { getAuditService } from "../../core/services/audit/audit.factory";
import { createAttachmentLink } from "../../core/db/repos/attachmentLinksRepo";
import { getDbPool } from "../../db/pool";
import * as repo from "./announcements.repo";

// ── Schemas ──────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  requireAck: z.boolean().optional().default(false),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  requireAck: z.boolean().optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
});

// ── Handlers ─────────────────────────────────────────

export async function createAnnouncementHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createSchema.parse(req.body);
    const ctx = req.ctx;

    const announcement = await repo.createAnnouncement({
      instanceId: ctx.instanceId,
      createdByUserId: ctx.actor!.userId,
      title: input.title,
      body: input.body,
      requireAck: input.requireAck,
    });

    for (const aid of input.attachmentIds) {
      await createAttachmentLink({
        instanceId: ctx.instanceId,
        attachmentId: aid,
        targetType: "ANNOUNCEMENT",
        targetId: announcement.id,
      });
    }

    await getAuditService().log(ctx, {
      action: "ANNOUNCEMENT_CREATED",
      targetType: "announcement",
      targetId: announcement.id,
    });

    res.status(201).json(announcement);
  } catch (e) {
    next(e);
  }
}

export async function listAnnouncementsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;

    const filters = {
      archived:
        req.query.archived === "true"
          ? true
          : req.query.archived === "false"
            ? false
            : undefined,
      requireAck:
        req.query.requireAck === "true"
          ? true
          : req.query.requireAck === "false"
            ? false
            : undefined,
    };

    const result = await repo.listAnnouncements(
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

export async function getAnnouncementHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const a = await repo.findAnnouncementById(
      req.ctx.instanceId,
      req.params.id as string,
    );
    if (!a) throw new AppError(404, "NOT_FOUND", "Announcement not found");
    res.json(a);
  } catch (e) {
    next(e);
  }
}

export async function updateAnnouncementHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateSchema.parse(req.body);
    const ctx = req.ctx;

    const updated = await repo.updateAnnouncement(
      ctx.instanceId,
      req.params.id as string,
      {
        title: input.title,
        body: input.body,
        requireAck: input.requireAck,
      },
    );
    if (!updated)
      throw new AppError(404, "NOT_FOUND", "Announcement not found");

    if (input.attachmentIds !== undefined) {
      await getDbPool().query(
        `DELETE FROM attachment_links
         WHERE instance_id = $1 AND target_type = 'ANNOUNCEMENT' AND target_id = $2`,
        [ctx.instanceId, req.params.id as string],
      );
      for (const aid of input.attachmentIds) {
        await createAttachmentLink({
          instanceId: ctx.instanceId,
          attachmentId: aid,
          targetType: "ANNOUNCEMENT",
          targetId: req.params.id as string,
        });
      }
    }

    await getAuditService().log(ctx, {
      action: "ANNOUNCEMENT_UPDATED",
      targetType: "announcement",
      targetId: req.params.id as string,
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function archiveAnnouncementHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await repo.updateAnnouncement(
      req.ctx.instanceId,
      req.params.id as string,
      {
        archivedAt: new Date().toISOString(),
      },
    );
    if (!updated)
      throw new AppError(404, "NOT_FOUND", "Announcement not found");

    await getAuditService().log(req.ctx, {
      action: "ANNOUNCEMENT_ARCHIVED",
      targetType: "announcement",
      targetId: req.params.id as string,
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function ackAnnouncementHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ctx = req.ctx;
    if (!ctx.actor!.unitId) throw Errors.forbidden();

    const a = await repo.findAnnouncementById(
      ctx.instanceId,
      req.params.id as string,
    );
    if (!a) throw new AppError(404, "NOT_FOUND", "Announcement not found");

    const existing = await repo.findAck(
      ctx.instanceId,
      req.params.id as string,
      ctx.actor!.userId,
    );
    if (existing) {
      res.json({ alreadyAcked: true });
      return;
    }

    const ack = await repo.createAck({
      instanceId: ctx.instanceId,
      announcementId: req.params.id as string,
      unitId: ctx.actor!.unitId,
      userId: ctx.actor!.userId,
    });

    await getAuditService().log(ctx, {
      action: "ANNOUNCEMENT_ACK",
      targetType: "announcement",
      targetId: req.params.id as string,
      metadata: { unitId: ctx.actor!.unitId },
    });

    res.status(201).json({ alreadyAcked: false, ack });
  } catch (e) {
    next(e);
  }
}
