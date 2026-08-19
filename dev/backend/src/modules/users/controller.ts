import { NextFunction, Request, Response } from 'express';
import {
  parseCreateResidentInput,
  parseCreateStaffInput,
  parseIdParam,
  parsePatchResidentInput,
  parsePatchStaffInput,
  parseTenantUsersListQuery,
} from './dto';
import {
  createResidentService,
  createStaffService,
  disableResidentService,
  disableStaffService,
  listResidentsService,
  listStaffService,
  patchResidentService,
  patchStaffService,
} from './service';

export async function listResidentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseTenantUsersListQuery(req.query);
    const result = await listResidentsService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createResidentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseCreateResidentInput(req.body);
    const result = await createResidentService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchResidentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseIdParam(req.params);
    const input = parsePatchResidentInput(req.body);
    const result = await patchResidentService(req.ctx, userId, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function disableResidentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseIdParam(req.params);
    const result = await disableResidentService(req.ctx, userId);
    res.json({
      ok: true,
      id: result.id,
      status: result.status,
      disabledAt: result.disabledAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function listStaffHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseTenantUsersListQuery(req.query);
    const result = await listStaffService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createStaffHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseCreateStaffInput(req.body);
    const result = await createStaffService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchStaffHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseIdParam(req.params);
    const input = parsePatchStaffInput(req.body);
    const result = await patchStaffService(req.ctx, userId, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function disableStaffHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = parseIdParam(req.params);
    const result = await disableStaffService(req.ctx, userId);
    res.json({
      ok: true,
      id: result.id,
      status: result.status,
      disabledAt: result.disabledAt,
    });
  } catch (error) {
    next(error);
  }
}
