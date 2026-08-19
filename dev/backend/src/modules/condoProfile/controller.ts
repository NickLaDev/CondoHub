import { NextFunction, Request, Response } from 'express';
import { parseUpdateCondoProfileInput } from './dto';
import { getCondoProfileService, updateCondoProfileService } from './service';

export async function getCondoProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getCondoProfileService(req.ctx);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchCondoProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = parseUpdateCondoProfileInput(req.body);
    const result = await updateCondoProfileService(req.ctx, input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
