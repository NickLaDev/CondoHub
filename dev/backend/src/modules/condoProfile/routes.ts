import { Router } from 'express';
import { PERMISSIONS } from '../../core/contract/permissions';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { getCondoProfileHandler, patchCondoProfileHandler } from './controller';

const router = Router({ mergeParams: true });

router.get(
  '/condo/profile',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  getCondoProfileHandler,
);

router.patch(
  '/condo/profile',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  patchCondoProfileHandler,
);

export default router;
