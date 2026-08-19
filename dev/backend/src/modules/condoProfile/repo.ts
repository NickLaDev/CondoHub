import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { UpdateCondoProfileInput } from './dto';

type CondoProfileRow = {
  instance_id: string;
  display_name: string;
  legal_name: string | null;
  address: unknown;
  settings: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CondoProfile = {
  instanceId: string;
  displayName: string;
  legalName: string | null;
  address: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toIso(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return String(value);
}

function mapCondoProfile(row: CondoProfileRow): CondoProfile {
  return {
    instanceId: row.instance_id,
    displayName: row.display_name,
    legalName: row.legal_name,
    address: normalizeJsonObject(row.address),
    settings: normalizeJsonObject(row.settings),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function getCondoProfile(instanceId: string): Promise<CondoProfile | null> {
  try {
    const result = await getDbPool().query<CondoProfileRow>(
      `
      select
        cp.instance_id,
        cp.display_name,
        cp.legal_name,
        cp.address,
        cp.settings,
        cp.created_at,
        cp.updated_at
      from public.condo_profile cp
      where cp.instance_id = $1
      limit 1
      `,
      [instanceId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapCondoProfile(result.rows[0]);
  } catch (error) {
    console.error('[CONDO_PROFILE_REPO] getCondoProfile failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load condo profile');
  }
}

export async function updateCondoProfile(
  instanceId: string,
  input: UpdateCondoProfileInput,
): Promise<CondoProfile | null> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [instanceId];

    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (input.displayName !== undefined) {
      setClauses.push(`display_name = ${bind(input.displayName)}`);
    }

    if (input.legalName !== undefined) {
      setClauses.push(`legal_name = ${bind(input.legalName)}`);
    }

    if (input.address !== undefined) {
      setClauses.push(`address = ${bind(JSON.stringify(input.address))}::jsonb`);
    }

    if (input.settings !== undefined) {
      setClauses.push(`settings = ${bind(JSON.stringify(input.settings))}::jsonb`);
    }

    if (setClauses.length === 0) {
      throw Errors.validationError({ body: 'No fields to update' });
    }

    setClauses.push('updated_at = now()');

    const result = await getDbPool().query<CondoProfileRow>(
      `
      update public.condo_profile
      set ${setClauses.join(', ')}
      where instance_id = $1
      returning
        instance_id,
        display_name,
        legal_name,
        address,
        settings,
        created_at,
        updated_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapCondoProfile(result.rows[0]);
  } catch (error) {
    console.error('[CONDO_PROFILE_REPO] updateCondoProfile failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update condo profile');
  }
}
