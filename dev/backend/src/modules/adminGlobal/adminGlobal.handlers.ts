import { NextFunction, Request, Response } from 'express';
import {
  parseAdminInstanceIdParam,
  parseAdminInstancesListQuery,
  parseAdminPlanIdParam,
  parseAdminPlansListQuery,
  parseCreateAdminInstanceInput,
  parseCreateAdminPlanInput,
  parseResetSindicoSupportInput,
  parseUpdateAdminInstanceInput,
  parseUpdateAdminPlanInput,
} from './adminGlobal.dto';
import {
  archiveAdminPlanService,
  createAdminInstanceService,
  createAdminPlanService,
  getAdminInstanceByIdService,
  getAdminPlanByIdService,
  getAdminStatsService,
  listAdminInstancesService,
  listAdminPlansService,
  reactivateAdminInstanceService,
  resetSindicoSupportService,
  suspendAdminInstanceService,
  updateAdminInstanceService,
  updateAdminPlanService,
} from './adminGlobal.service';

export async function listAdminInstancesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = parseAdminInstancesListQuery(req.query);
    const result = await listAdminInstancesService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createAdminInstanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = parseCreateAdminInstanceInput(req.body);
    const result = await createAdminInstanceService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminInstanceByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = parseAdminInstanceIdParam(req.params);
    const result = await getAdminInstanceByIdService(req.ctx, instanceId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminInstanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = parseAdminInstanceIdParam(req.params);
    const input = parseUpdateAdminInstanceInput(req.body);
    const result = await updateAdminInstanceService(req.ctx, instanceId, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function suspendAdminInstanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = parseAdminInstanceIdParam(req.params);
    const result = await suspendAdminInstanceService(req.ctx, instanceId);
    res.json({
      ok: true,
      instanceId: result.id,
      status: result.status,
      suspendedAt: result.suspendedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function reactivateAdminInstanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = parseAdminInstanceIdParam(req.params);
    const result = await reactivateAdminInstanceService(req.ctx, instanceId);
    res.json({
      ok: true,
      instanceId: result.id,
      status: result.status,
      suspendedAt: result.suspendedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAdminPlansHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = parseAdminPlansListQuery(req.query);
    const result = await listAdminPlansService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createAdminPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = parseCreateAdminPlanInput(req.body);
    const result = await createAdminPlanService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminPlanByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const planId = parseAdminPlanIdParam(req.params);
    const result = await getAdminPlanByIdService(req.ctx, planId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const planId = parseAdminPlanIdParam(req.params);
    const input = parseUpdateAdminPlanInput(req.body);
    const result = await updateAdminPlanService(req.ctx, planId, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function archiveAdminPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const planId = parseAdminPlanIdParam(req.params);
    const result = await archiveAdminPlanService(req.ctx, planId);
    res.json({
      ok: true,
      planId: result.id,
      archivedAt: result.archivedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getAdminStatsService(req.ctx);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetSindicoSupportHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = parseResetSindicoSupportInput(req.body);
    const result = await resetSindicoSupportService(req.ctx, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
