import { AppError, Errors } from '../../contract/errors';
import { formatDbError, getDbPool } from '../../../db/pool';
import { withTx } from '../../../db/tx';

type SessionRow = {
  id: string;
  instance_id: string | null;
  user_id: string;
  refresh_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  rotated_at: Date | null;
};

export type SessionRecord = {
  id: string;
  instanceId: string | null;
  userId: string;
  refreshHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  rotatedAt: Date | null;
};

function mapSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    instanceId: row.instance_id,
    userId: row.user_id,
    refreshHash: row.refresh_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
  };
}

export async function createSession(params: {
  instanceId: string | null;
  userId: string;
  refreshHash: string;
  expiresAt: Date;
}): Promise<SessionRecord> {
  try {
    const result = await getDbPool().query<SessionRow>(
      `
      insert into public.sessions (instance_id, user_id, refresh_hash, expires_at, created_at)
      values ($1, $2, $3, $4, now())
      returning id, instance_id, user_id, refresh_hash, expires_at, revoked_at, created_at, rotated_at
      `,
      [params.instanceId, params.userId, params.refreshHash, params.expiresAt],
    );

    return mapSession(result.rows[0]);
  } catch (error) {
    console.error('[SESSIONS_REPO] createSession failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create session');
  }
}

export async function findByRefreshHash(refreshHash: string): Promise<SessionRecord | null> {
  try {
    const result = await getDbPool().query<SessionRow>(
      `
      select id, instance_id, user_id, refresh_hash, expires_at, revoked_at, created_at, rotated_at
      from public.sessions
      where refresh_hash = $1
      limit 1
      `,
      [refreshHash],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapSession(result.rows[0]);
  } catch (error) {
    console.error('[SESSIONS_REPO] findByRefreshHash failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load session');
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await getDbPool().query(
      `
      update public.sessions
      set revoked_at = coalesce(revoked_at, now())
      where id = $1
      `,
      [sessionId],
    );
  } catch (error) {
    console.error('[SESSIONS_REPO] revokeSession failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to revoke session');
  }
}

export async function rotateSession(params: {
  oldSessionId: string;
  newRefreshHash: string;
  newExpiresAt: Date;
}): Promise<SessionRecord> {
  return withTx(async (client) => {
    const existingResult = await client.query<SessionRow>(
      `
      select id, instance_id, user_id, refresh_hash, expires_at, revoked_at, created_at, rotated_at
      from public.sessions
      where id = $1
      for update
      `,
      [params.oldSessionId],
    );

    if (existingResult.rowCount === 0) {
      throw Errors.authInvalid();
    }

    const existing = mapSession(existingResult.rows[0]);
    const now = new Date();

    if (existing.revokedAt || existing.expiresAt <= now) {
      throw Errors.authInvalid();
    }

    await client.query(
      `
      update public.sessions
      set revoked_at = now(), rotated_at = now()
      where id = $1
      `,
      [existing.id],
    );

    const insertedResult = await client.query<SessionRow>(
      `
      insert into public.sessions (instance_id, user_id, refresh_hash, expires_at, created_at)
      values ($1, $2, $3, $4, now())
      returning id, instance_id, user_id, refresh_hash, expires_at, revoked_at, created_at, rotated_at
      `,
      [existing.instanceId, existing.userId, params.newRefreshHash, params.newExpiresAt],
    );

    return mapSession(insertedResult.rows[0]);
  });
}
