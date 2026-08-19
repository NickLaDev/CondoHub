import { PoolClient } from 'pg';
import { AppError, Errors } from '../core/contract/errors';
import { formatDbError, getDbPool } from './pool';

export async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DB_TX_ROLLBACK_ERROR]', formatDbError(rollbackError));
    }

    if (error instanceof AppError) {
      throw error;
    }

    console.error('[DB_TX_ERROR]', formatDbError(error));
    throw Errors.dbError();
  } finally {
    client.release();
  }
}
