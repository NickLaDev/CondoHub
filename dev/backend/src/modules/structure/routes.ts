import { Router } from 'express';
import { PERMISSIONS } from '../../core/contract/permissions';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import {
  archiveBlockHandler,
  archiveUnitHandler,
  createBlockHandler,
  createUnitHandler,
  listBlocksHandler,
  listUnitsHandler,
  patchBlockHandler,
  patchUnitHandler,
} from './controller';

const router = Router({ mergeParams: true });

router.get(
  '/structure/blocks',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  listBlocksHandler,
);
router.post(
  '/structure/blocks',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  createBlockHandler,
);
router.patch(
  '/structure/blocks/:id',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  patchBlockHandler,
);
router.post(
  '/structure/blocks/:id/archive',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  archiveBlockHandler,
);

router.get(
  '/structure/units',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  listUnitsHandler,
);
router.post(
  '/structure/units',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  createUnitHandler,
);
router.patch(
  '/structure/units/:id',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  patchUnitHandler,
);
router.post(
  '/structure/units/:id/archive',
  requireAuth(),
  requirePermission(PERMISSIONS.STRUCTURE_MANAGE),
  archiveUnitHandler,
);

export default router;
