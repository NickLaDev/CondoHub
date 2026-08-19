import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError, Errors } from "../../core/contract/errors";
import { ROLES } from "../../core/contract/roles";
import {
  parsePagination,
  respondPaginated,
} from "../../core/contract/pagination";
import { getAuditService } from "../../core/services/audit/audit.factory";
import { createAttachmentLink } from "../../core/db/repos/attachmentLinksRepo";
import * as repo from "./channels.repo";

// ── Schemas ──────────────────────────────────────────

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional().default("PUBLIC"),
});
const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});
const createPostSchema = z.object({
  body: z.string().min(1),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
});
const updatePostSchema = z.object({ body: z.string().min(1).optional() });
const createCommentSchema = z.object({ body: z.string().min(1) });
const updateCommentSchema = z.object({ body: z.string().min(1).optional() });
const silenceSchema = z.object({
  userId: z.string().min(1),
  minutes: z.number().positive().optional(),
  reason: z.string().optional(),
});
const removeContentSchema = z.object({
  contentType: z.enum(["post", "comment"]),
  contentId: z.string().uuid(),
  reason: z.string().optional(),
});

// ── Helpers ──────────────────────────────────────────

function isSindico(req: Request): boolean {
  return req.ctx.actor!.roles.includes(ROLES.SINDICO_ADMIN);
}

async function ensureChannel(instanceId: string, channelId: string) {
  const ch = await repo.findChannelById(instanceId, channelId);
  if (!ch) throw new AppError(404, "NOT_FOUND", "Channel not found");
  return ch;
}

// ── Channels ─────────────────────────────────────────

export async function createChannelHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createChannelSchema.parse(req.body);
    const ch = await repo.createChannel({
      instanceId: req.ctx.instanceId,
      name: input.name,
      visibility: input.visibility,
    });
    await getAuditService().log(req.ctx, {
      action: "CHANNEL_CREATED",
      targetType: "channel",
      targetId: ch.id,
    });
    res.status(201).json(ch);
  } catch (e) {
    next(e);
  }
}

export async function listChannelsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query);
    const result = await repo.listChannels(
      req.ctx.instanceId,
      limit,
      (page - 1) * limit,
    );
    respondPaginated(res, result.items, result.total, page, limit);
  } catch (e) {
    next(e);
  }
}

export async function updateChannelHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateChannelSchema.parse(req.body);
    await ensureChannel(req.ctx.instanceId, req.params.id as string);
    const updated = await repo.updateChannel(
      req.ctx.instanceId,
      req.params.id as string,
      input,
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function archiveChannelHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await ensureChannel(req.ctx.instanceId, req.params.id as string);
    const updated = await repo.updateChannel(
      req.ctx.instanceId,
      req.params.id as string,
      { archivedAt: new Date().toISOString() },
    );
    await getAuditService().log(req.ctx, {
      action: "CHANNEL_ARCHIVED",
      targetType: "channel",
      targetId: req.params.id as string,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

// ── Posts ─────────────────────────────────────────────

export async function createPostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createPostSchema.parse(req.body);
    await ensureChannel(req.ctx.instanceId, req.params.id as string);
    const post = await repo.createPost({
      instanceId: req.ctx.instanceId,
      channelId: req.params.id as string,
      authorUserId: req.ctx.actor!.userId,
      body: input.body,
    });
    for (const aid of input.attachmentIds) {
      await createAttachmentLink({
        instanceId: req.ctx.instanceId,
        attachmentId: aid,
        targetType: "CHANNEL_POST",
        targetId: post.id,
      });
    }
    await getAuditService().log(req.ctx, {
      action: "CHANNEL_POST_CREATED",
      targetType: "channel_post",
      targetId: post.id,
    });
    res.status(201).json(post);
  } catch (e) {
    next(e);
  }
}

export async function listPostsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query);
    await ensureChannel(req.ctx.instanceId, req.params.id as string);
    const result = await repo.listPosts(
      req.ctx.instanceId,
      req.params.id as string,
      limit,
      (page - 1) * limit,
    );
    respondPaginated(res, result.items, result.total, page, limit);
  } catch (e) {
    next(e);
  }
}

export async function updatePostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updatePostSchema.parse(req.body);
    const post = await repo.findPostById(
      req.ctx.instanceId,
      req.params.postId as string,
    );
    if (!post || post.deletedAt)
      throw new AppError(404, "NOT_FOUND", "Post not found");
    if (post.authorUserId !== req.ctx.actor!.userId && !isSindico(req))
      throw Errors.forbidden();
    const updated = await repo.updatePost(
      req.ctx.instanceId,
      req.params.postId as string,
      input,
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function deletePostHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const post = await repo.findPostById(
      req.ctx.instanceId,
      req.params.postId as string,
    );
    if (!post || post.deletedAt)
      throw new AppError(404, "NOT_FOUND", "Post not found");
    if (post.authorUserId !== req.ctx.actor!.userId && !isSindico(req))
      throw Errors.forbidden();
    await repo.updatePost(req.ctx.instanceId, req.params.postId as string, {
      deletedAt: new Date().toISOString(),
    });
    await getAuditService().log(req.ctx, {
      action: "CHANNEL_POST_DELETED",
      targetType: "channel_post",
      targetId: req.params.postId as string,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

// ── Comments ─────────────────────────────────────────

export async function createCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createCommentSchema.parse(req.body);
    const post = await repo.findPostById(
      req.ctx.instanceId,
      req.params.postId as string,
    );
    if (!post || post.deletedAt)
      throw new AppError(404, "NOT_FOUND", "Post not found");
    const comment = await repo.createComment({
      instanceId: req.ctx.instanceId,
      postId: req.params.postId as string,
      authorUserId: req.ctx.actor!.userId,
      body: input.body,
    });
    res.status(201).json(comment);
  } catch (e) {
    next(e);
  }
}

export async function listCommentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = parsePagination(req.query);
    const result = await repo.listComments(
      req.ctx.instanceId,
      req.params.postId as string,
      limit,
      (page - 1) * limit,
    );
    respondPaginated(res, result.items, result.total, page, limit);
  } catch (e) {
    next(e);
  }
}

export async function updateCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateCommentSchema.parse(req.body);
    const comment = await repo.findCommentById(
      req.ctx.instanceId,
      req.params.commentId as string,
    );
    if (!comment || comment.deletedAt)
      throw new AppError(404, "NOT_FOUND", "Comment not found");
    if (comment.authorUserId !== req.ctx.actor!.userId && !isSindico(req))
      throw Errors.forbidden();
    const updated = await repo.updateComment(
      req.ctx.instanceId,
      req.params.commentId as string,
      input,
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function deleteCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comment = await repo.findCommentById(
      req.ctx.instanceId,
      req.params.commentId as string,
    );
    if (!comment || comment.deletedAt)
      throw new AppError(404, "NOT_FOUND", "Comment not found");
    if (comment.authorUserId !== req.ctx.actor!.userId && !isSindico(req))
      throw Errors.forbidden();
    await repo.updateComment(
      req.ctx.instanceId,
      req.params.commentId as string,
      {
        deletedAt: new Date().toISOString(),
      },
    );
    await getAuditService().log(req.ctx, {
      action: "CHANNEL_COMMENT_DELETED",
      targetType: "channel_comment",
      targetId: req.params.commentId as string,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

// ── Moderação ────────────────────────────────────────

export async function silenceUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = silenceSchema.parse(req.body);
    await ensureChannel(req.ctx.instanceId, req.params.id as string);
    const action = await repo.createModerationAction({
      instanceId: req.ctx.instanceId,
      channelId: req.params.id as string,
      action: "SILENCE_USER",
      targetUserId: input.userId,
      targetContentType: null,
      targetContentId: null,
      reason: input.reason ?? null,
      metadata: { minutes: input.minutes ?? null },
      createdByUserId: req.ctx.actor!.userId,
    });
    await getAuditService().log(req.ctx, {
      action: "MODERATION_SILENCE_USER",
      targetType: "channel",
      targetId: req.params.id as string,
      metadata: { userId: input.userId, minutes: input.minutes },
    });
    res.json(action);
  } catch (e) {
    next(e);
  }
}

export async function removeContentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = removeContentSchema.parse(req.body);
    await ensureChannel(req.ctx.instanceId, req.params.id as string);
    if (input.contentType === "post")
      await repo.updatePost(req.ctx.instanceId, input.contentId as string, {
        deletedAt: new Date().toISOString(),
      });
    else if (input.contentType === "comment")
      await repo.updateComment(req.ctx.instanceId, input.contentId as string, {
        deletedAt: new Date().toISOString(),
      });
    const action = await repo.createModerationAction({
      instanceId: req.ctx.instanceId,
      channelId: req.params.id as string,
      action: "REMOVE_CONTENT",
      targetUserId: null,
      targetContentType: input.contentType,
      targetContentId: input.contentId as string,
      reason: input.reason ?? null,
      metadata: {},
      createdByUserId: req.ctx.actor!.userId,
    });
    await getAuditService().log(req.ctx, {
      action: "MODERATION_REMOVE_CONTENT",
      targetType: "channel",
      targetId: req.params.id as string,
      metadata: { contentType: input.contentType, contentId: input.contentId },
    });
    res.json(action);
  } catch (e) {
    next(e);
  }
}
