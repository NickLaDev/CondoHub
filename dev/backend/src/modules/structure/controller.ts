import { NextFunction, Request, Response } from 'express';
import {
  parseCreateBlockInput,
  parseCreateUnitInput,
  parseIdParam,
  parsePatchBlockInput,
  parsePatchUnitInput,
  parseStructureListQuery,
} from './dto';
import {
  archiveBlockService,
  archiveUnitService,
  createBlockService,
  createUnitService,
  listBlocksService,
  listUnitsService,
  patchBlockService,
  patchUnitService,
} from './service';

export async function listBlocksHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseStructureListQuery(req.query);
    const result = await listBlocksService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createBlockHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseCreateBlockInput(req.body);
    const result = await createBlockService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchBlockHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const blockId = parseIdParam(req.params);
    const input = parsePatchBlockInput(req.body);
    const result = await patchBlockService(req.ctx, blockId, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function archiveBlockHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const blockId = parseIdParam(req.params);
    const result = await archiveBlockService(req.ctx, blockId);
    res.json({
      ok: true,
      id: result.id,
      archivedAt: result.archivedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function listUnitsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseStructureListQuery(req.query);
    const result = await listUnitsService(req.ctx, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createUnitHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = parseCreateUnitInput(req.body);
    const result = await createUnitService(req.ctx, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchUnitHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const unitId = parseIdParam(req.params);
    const input = parsePatchUnitInput(req.body);
    const result = await patchUnitService(req.ctx, unitId, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function archiveUnitHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const unitId = parseIdParam(req.params);
    const result = await archiveUnitService(req.ctx, unitId);
    res.json({
      ok: true,
      id: result.id,
      archivedAt: result.archivedAt,
    });
  } catch (error) {
    next(error);
  }
}
