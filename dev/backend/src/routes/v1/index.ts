import { Router } from 'express';
import { authRateLimiter } from '../../middleware/rateLimit';
import { notImplementedHandler } from './stubs';
import adminRouter from './admin';

const router = Router();

// Global auth route
router.post('/auth/refresh', authRateLimiter, notImplementedHandler);

// Admin routes
router.use('/admin', adminRouter);

export default router;
