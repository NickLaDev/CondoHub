import { Router } from 'express';
import { PERMISSIONS } from '../../core/contract/permissions';
import { authRateLimiter } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import {
  cancelActiveInviteCodeHandler,
  createInviteCodeHandler,
  createInviteHandler,
  getActiveInviteCodeHandler,
  listInvitesHandler,
  resolveInviteCodeHandler,
  revokeInviteHandler,
} from './controller';

const router = Router({ mergeParams: true });

router.post('/invites/code', requireAuth(), createInviteCodeHandler);
router.get('/invites/code/active', requireAuth(), getActiveInviteCodeHandler);
router.delete('/invites/code/active', requireAuth(), cancelActiveInviteCodeHandler);
router.post('/invites/code/resolve', authRateLimiter, resolveInviteCodeHandler);

router.post('/invites', requireAuth(), requirePermission(PERMISSIONS.INVITES_MANAGE), createInviteHandler);
router.get('/invites', requireAuth(), requirePermission(PERMISSIONS.INVITES_MANAGE), listInvitesHandler);
router.post(
  '/invites/:id/revoke',
  requireAuth(),
  requirePermission(PERMISSIONS.INVITES_MANAGE),
  revokeInviteHandler,
);

export default router;
