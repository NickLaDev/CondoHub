import { Router, NextFunction, Request, Response } from 'express';
import { Errors } from '../core/contract/errors';
import { formatDbError, getDbPool } from '../db/pool';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get('/ready', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await getDbPool().query('select 1');
    res.json({ ok: true });
  } catch (error) {
    console.error('[READY_CHECK_FAILED]', formatDbError(error));
    next(Errors.dbUnavailable());
  }
});

export default router;
