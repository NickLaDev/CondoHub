import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ErrorResponse } from '../core/contract/errors';

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  skip: () => !env.RATE_LIMIT_ENABLED,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
    details: {},
  } satisfies ErrorResponse,
});
