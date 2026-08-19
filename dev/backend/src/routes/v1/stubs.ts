import { Request, Response } from 'express';
import { Errors } from '../../core/contract/errors';

export function notImplementedHandler(_req: Request, _res: Response): void {
  throw Errors.notImplemented();
}
