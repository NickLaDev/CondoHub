import express from 'express';
import helmet from 'helmet';
import { buildCorsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { contextBuilder } from './middleware/contextBuilder';
import { errorHandler } from './middleware/errorHandler';
import { authRateLimiter } from './middleware/rateLimit';
import { requireAuth } from './middleware/requireAuth';
import { requirePermission } from './middleware/requirePermission';
import { PERMISSIONS } from './core/contract/permissions';
import {
  adminLoginHandler,
  adminMeHandler,
  globalLoginHandler,
  refreshHandler,
  selectInstanceHandler,
} from './modules/auth/auth.handlers';
import healthRouter from './routes/health';
import swaggerRouter from './routes/swagger';
import adminRouter from './routes/v1/admin';
import tenantRouter from './routes/v1/tenant';

const app = express();

// Security & parsing
app.use(helmet());
app.use(express.json());

// CORS
app.use(buildCorsMiddleware());

// Request ID
app.use(requestIdMiddleware);

// Health (before context builder — no auth/tenant needed)
app.use(healthRouter);

// Swagger UI
app.use(swaggerRouter);

// API v1 global routes (no tenant resolution)
app.post('/api/v1/auth/login', authRateLimiter, globalLoginHandler);
app.post('/api/v1/auth/select-instance', authRateLimiter, selectInstanceHandler);
app.post('/api/v1/auth/refresh', authRateLimiter, refreshHandler);
app.post('/api/v1/admin/auth/login', authRateLimiter, adminLoginHandler);
app.get('/api/v1/admin/auth/me', requireAuth(), requirePermission(PERMISSIONS.ADMIN_MANAGE), adminMeHandler);
app.use('/api/v1/admin', requireAuth(), requirePermission(PERMISSIONS.ADMIN_MANAGE), adminRouter);

// API v1 tenant routes (tenant resolution required)
app.use('/api/v1/:instanceKey', contextBuilder, tenantRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
