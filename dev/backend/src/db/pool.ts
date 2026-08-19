import { Pool, PoolConfig } from 'pg';
import { env } from '../config/env';

let pool: Pool | null = null;

function resolveSsl(connectionString: string): PoolConfig['ssl'] {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');
    if (sslMode && sslMode !== 'disable') {
      return { rejectUnauthorized: false };
    }
  } catch {
    // Keep default SSL behavior if URL parsing fails.
  }
  return undefined;
}

export function formatDbError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    const code = (error as Error & { code?: string }).code;
    if (code) {
      details.code = code;
    }

    return details;
  }

  return { message: String(error) };
}

export function getDbPool(): Pool {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: resolveSsl(env.DATABASE_URL),
    });

    pool.on('error', (error: Error) => {
      console.error('[DB_POOL_ERROR]', formatDbError(error));
    });

    console.log('[CondoHub] DB pool initialized');
  }

  return pool;
}
