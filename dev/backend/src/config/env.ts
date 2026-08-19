import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_MODE: z.enum(['mock', 'jwt']).default('mock'),
  TENANT_MODE: z.enum(['mock', 'path']).default('mock'),
  UPLOAD_MODE: z.enum(['local', 'supabase']).default('local'),
  AUDIT_MODE: z.enum(['console', 'db']).default('console'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().default('dev_secret'),
  INVITE_CODE_PEPPER: z.string().default('dev_invite_code_pepper'),
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SUSPENDED_INSTANCE_KEYS: z
    .string()
    .default('')
    .transform((v) => (v ? v.split(',').map((s) => s.trim()) : [])),

  // Supabase Storage (obrigatório quando UPLOAD_MODE=supabase)
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('attachments'),
  SUPABASE_STORAGE_SIGNED_UPLOAD_TTL_SEC: z.coerce.number().default(7200),
  SUPABASE_STORAGE_SIGNED_DOWNLOAD_TTL_SEC: z.coerce.number().default(600),
});

function loadEnv() {
  console.log(`[CondoHub] DATABASE_URL present=${Boolean(process.env.DATABASE_URL)}`);

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
