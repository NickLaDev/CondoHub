import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Errors } from '../../core/contract/errors';
import { PERMISSIONS } from '../../core/contract/permissions';
import { authRateLimiter } from '../../middleware/rateLimit';
import { requireAuth, requireAuthIfPresent } from '../../middleware/requireAuth';
import { requirePermission } from '../../middleware/requirePermission';
import { getUploadService } from '../../core/services/uploads/uploads.factory';
import { getAuditService } from '../../core/services/audit/audit.factory';
import { DbAuditService } from '../../core/services/audit/audit.db.stub';
import { getQrService } from '../../core/services/qr/qr.factory';
import { getNotificationService } from '../../core/services/notifications/notifications.factory';
import { PUSH_PLATFORMS } from '../../core/services/notifications/notifications.types';
import { env } from '../../config/env';
import {
  registerWithInviteHandler,
  tenantLoginHandler,
  tenantLogoutHandler,
  tenantMeHandler,
} from '../../modules/auth/auth.handlers';
import { listTenantAuditLogs } from '../../modules/audit/audit.repo';
import { parseTenantLogsQuery } from '../../modules/audit/audit.query';
import condoProfileRouter from '../../modules/condoProfile/routes';
import structureRouter from '../../modules/structure/routes';
import usersRouter from '../../modules/users/routes';
import invitesRouter from '../../modules/invites/routes';
import ticketsRouter from '../../modules/tickets/tickets.routes';
import { deliveryRouter, turnRouter } from '../../modules/deliveries/deliveries.routes';
import dashboardRouter from '../../modules/dashboard/dashboard.routes';
import communicationRouter from '../../modules/communication/communication.routes';

const router = Router({ mergeParams: true });

const qrService = getQrService();
const qrAuditService = new DbAuditService();
const notificationService = getNotificationService();

// Guard: all tenant routes require instanceId
function requireTenant(req: Request, _res: Response, next: NextFunction): void {
  if (!req.ctx.instanceId) {
    throw Errors.tenantRequired();
  }
  next();
}

router.use(requireTenant);

// --- Auth stubs ---
router.post('/auth/login', authRateLimiter, tenantLoginHandler);
router.post('/auth/register-with-invite', authRateLimiter, registerWithInviteHandler);
router.post('/auth/logout', requireAuth(), tenantLogoutHandler);
router.get('/auth/me', requireAuth(), tenantMeHandler);

// --- Tenant foundational modules (Phase 8) ---
router.use(condoProfileRouter);
router.use(structureRouter);
router.use(usersRouter);
router.use(invitesRouter);

// --- Uploads ---
const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().positive(),
});

router.post('/uploads/presign', requireAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = presignSchema.parse(req.body);
    const result = await getUploadService().presign(req.ctx, input);
    await getAuditService().log(req.ctx, {
      action: 'UPLOAD_PRESIGN_ISSUED',
      targetType: 'attachment',
      targetId: result.attachmentId,
      metadata: {
        bucket: result.bucket ?? null,
        path: result.path ?? null,
        contentType: input.contentType,
        sizeBytes: input.size,
      },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const completeSchema = z.object({
  attachmentId: z.string().uuid(),
  bucket: z.string().optional(),
  path: z.string().optional(),
  contentType: z.string().min(1).optional(),
  sizeBytes: z.number().int().positive().optional(),
  checksumSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
});

router.post('/uploads/complete', requireAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = completeSchema.parse(req.body);
    const result = await getUploadService().complete(req.ctx, input);
    await getAuditService().log(req.ctx, {
      action: 'UPLOAD_COMPLETE_CONFIRMED',
      targetType: 'attachment',
      targetId: input.attachmentId,
      metadata: {
        bucket: result.bucket ?? input.bucket ?? null,
        path: result.path ?? input.path ?? null,
        checksumProvided: Boolean(input.checksumSha256),
      },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const attachmentUrlParamsSchema = z.object({
  id: z.string().uuid(),
});

router.get('/attachments/:id/url', requireAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = attachmentUrlParamsSchema.parse(req.params);
    const result = await getUploadService().getSignedDownloadUrl(req.ctx, params.id);
    await getAuditService().log(req.ctx, {
      action: 'ATTACHMENT_DOWNLOAD_URL_ISSUED',
      targetType: 'attachment',
      targetId: params.id,
      metadata: {
        expiresAt: result.expiresAt,
      },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Notifications + QR ---
const notificationRegisterSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(PUSH_PLATFORMS),
});

router.post('/notifications/register', requireAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = notificationRegisterSchema.parse(req.body);
    const result = await notificationService.register(req.ctx, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/qr/signature', requireAuthIfPresent(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await qrService.generateSignature(req.ctx);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const verifySchema = z.object({
  token: z.string().min(1),
});

router.post('/qr/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = verifySchema.parse(req.body);
    const result = await qrService.verify(req.ctx, input);
    await qrAuditService.log(req.ctx, {
      action: result.ok ? 'ACCESS_QR_VERIFIED' : 'ACCESS_QR_DENIED',
      targetType: 'qr_access',
      targetId: result.subjectUserId,
      metadata: {
        reason: result.reason ?? null,
        verifiedUnitId: result.unitId ?? null,
        subjectUserId: result.subjectUserId ?? null,
      },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Audit logs ---
router.get(
  '/logs',
  requireAuth(),
  requirePermission(PERMISSIONS.LOGS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseTenantLogsQuery(req.query);
      const result = await listTenantAuditLogs(req.ctx.instanceId, input);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// --- Communication + Operations ---
router.use('/deliveries', deliveryRouter);
router.use('/turns', turnRouter);
router.use('/dashboard', dashboardRouter);
router.use('/tickets', ticketsRouter);
router.use('/', communicationRouter);

// --- Debug (dev only) ---
if (env.AUTH_MODE === 'mock') {
  router.get('/_debug/ctx', (req: Request, res: Response) => {
    res.json(req.ctx);
  });
}

export default router;
