import { Router } from 'express';
import { PERMISSIONS } from '../../core/contract/permissions';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import {
  createResidentHandler,
  createStaffHandler,
  disableResidentHandler,
  disableStaffHandler,
  listResidentsHandler,
  listStaffHandler,
  patchResidentHandler,
  patchStaffHandler,
} from './controller';

const router = Router({ mergeParams: true });

router.get(
  '/users/residents',
  requireAuth(),
  requirePermission(PERMISSIONS.USERS_MANAGE),
  listResidentsHandler,
);
router.post(
  '/users/residents',
  requireAuth(),
  requirePermission(PERMISSIONS.USERS_MANAGE),
  createResidentHandler,
);
router.patch(
  '/users/residents/:id',
  requireAuth(),
  requirePermission(PERMISSIONS.USERS_MANAGE),
  patchResidentHandler,
);
router.post(
  '/users/residents/:id/disable',
  requireAuth(),
  requirePermission(PERMISSIONS.USERS_MANAGE),
  disableResidentHandler,
);

router.get('/users/staff', requireAuth(), requirePermission(PERMISSIONS.USERS_MANAGE), listStaffHandler);
router.post('/users/staff', requireAuth(), requirePermission(PERMISSIONS.USERS_MANAGE), createStaffHandler);
router.patch(
  '/users/staff/:id',
  requireAuth(),
  requirePermission(PERMISSIONS.USERS_MANAGE),
  patchStaffHandler,
);
router.post(
  '/users/staff/:id/disable',
  requireAuth(),
  requirePermission(PERMISSIONS.USERS_MANAGE),
  disableStaffHandler,
);

export default router;
