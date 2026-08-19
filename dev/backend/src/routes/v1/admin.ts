import { Router, Request, Response, NextFunction } from 'express';
import { listAdminAuditLogs } from '../../modules/audit/audit.repo';
import { parseAdminLogsQuery } from '../../modules/audit/audit.query';
import {
  archiveAdminPlanHandler,
  createAdminInstanceHandler,
  createAdminPlanHandler,
  getAdminInstanceByIdHandler,
  getAdminPlanByIdHandler,
  getAdminStatsHandler,
  listAdminInstancesHandler,
  listAdminPlansHandler,
  reactivateAdminInstanceHandler,
  resetSindicoSupportHandler,
  suspendAdminInstanceHandler,
  updateAdminInstanceHandler,
  updateAdminPlanHandler,
} from '../../modules/adminGlobal/adminGlobal.handlers';

const router = Router();

router.get('/instances', listAdminInstancesHandler);
router.post('/instances', createAdminInstanceHandler);
router.get('/instances/:id', getAdminInstanceByIdHandler);
router.patch('/instances/:id', updateAdminInstanceHandler);
router.post('/instances/:id/suspend', suspendAdminInstanceHandler);
router.post('/instances/:id/reactivate', reactivateAdminInstanceHandler);

router.get('/plans', listAdminPlansHandler);
router.post('/plans', createAdminPlanHandler);
router.get('/plans/:id', getAdminPlanByIdHandler);
router.patch('/plans/:id', updateAdminPlanHandler);
router.post('/plans/:id/archive', archiveAdminPlanHandler);

router.get('/stats', getAdminStatsHandler);
router.post('/support/reset-sindico', resetSindicoSupportHandler);

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseAdminLogsQuery(req.query);
    const result = await listAdminAuditLogs(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
