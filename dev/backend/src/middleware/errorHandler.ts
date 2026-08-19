import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorResponse } from '../core/contract/errors';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorResponse = {
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { issues: err.issues },
    };
    res.status(400).json(body);
    return;
  }

  console.error('[UNHANDLED_ERROR]', err);

  const body: ErrorResponse = {
    error: true,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    details: {},
  };
  res.status(500).json(body);
}
