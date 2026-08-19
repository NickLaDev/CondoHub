import { NextFunction, Request, Response } from 'express';
import {
  parseCreateInviteInput,
  parseIdParam,
  parseInstanceKeyParam,
  parseResolveInviteCodeInput,
  parseTenantInvitesListQuery,
} from './dto';
import {
  cancelActiveInviteCodeService,
  createInviteCodeService,
  createInviteService,
  getActiveInviteCodeService,
  listInvitesService,
  resolveInviteCodeService,
  revokeInviteService,
} from './service';

export async function createInviteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseCreateInviteInput(req.body);
    const result = await createInviteService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createInviteCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceKey = parseInstanceKeyParam(req.params);
    const result = await createInviteCodeService(req.ctx, instanceKey);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listInvitesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseTenantInvitesListQuery(req.query);
    const result = await listInvitesService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getActiveInviteCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getActiveInviteCodeService(req.ctx);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelActiveInviteCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await cancelActiveInviteCodeService(req.ctx);
    res.json({
      ok: true,
      inviteId: result.inviteId,
      revokedAt: result.revokedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function resolveInviteCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseResolveInviteCodeInput(req.body);
    const result = await resolveInviteCodeService(req.ctx, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function revokeInviteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inviteId = parseIdParam(req.params);
    const result = await revokeInviteService(req.ctx, inviteId);
    res.json({
      ok: true,
      id: result.id,
      revokedAt: result.revokedAt,
    });
  } catch (error) {
    next(error);
  }
}
