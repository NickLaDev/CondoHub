import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { InstanceRecord, InstanceStatus, INSTANCE_STATUS } from './instances.types';

type InstanceRow = {
  id: string;
  instance_key: string;
  status: string;
};

function mapStatus(status: string): InstanceStatus {
  if (status === INSTANCE_STATUS.ACTIVE || status === INSTANCE_STATUS.SUSPENDED) {
    return status;
  }

  throw Errors.dbError('Invalid instance status in database', { status });
}

function mapRow(row: InstanceRow): InstanceRecord {
  return {
    id: row.id,
    instanceKey: row.instance_key,
    status: mapStatus(row.status),
  };
}

export async function getInstanceByKey(instanceKey: string): Promise<InstanceRecord | null> {
  try {
    const result = await getDbPool().query<InstanceRow>(
      `
      select id, instance_key, status
      from public.instances
      where instance_key = $1
      limit 1
      `,
      [instanceKey],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapRow(result.rows[0]);
  } catch (error) {
    console.error('[INSTANCES_REPO] getInstanceByKey failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load instance by key');
  }
}

export async function getInstanceById(instanceId: string): Promise<InstanceRecord | null> {
  try {
    const result = await getDbPool().query<InstanceRow>(
      `
      select id, instance_key, status
      from public.instances
      where id = $1
      limit 1
      `,
      [instanceId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapRow(result.rows[0]);
  } catch (error) {
    console.error('[INSTANCES_REPO] getInstanceById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load instance by id');
  }
}
