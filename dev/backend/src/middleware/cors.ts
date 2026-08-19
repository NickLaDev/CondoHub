import cors from 'cors';
import { env } from '../config/env';

export function buildCorsMiddleware() {
  if (env.CORS_ORIGIN === '*') {
    return cors({ origin: true, credentials: true });
  }

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });
}
