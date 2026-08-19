import { PaginatedResponse } from '../../core/contract/pagination';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { CreateBlockInput, CreateUnitInput, PatchBlockInput, PatchUnitInput, StructureListQuery } from './dto';

type TotalRow = {
  total: string;
};

type BlockRow = {
  id: string;
  instance_id: string;
  label: string;
  archived_at: Date | string | null;
  created_at: Date | string;
};

type UnitRow = {
  id: string;
  instance_id: string;
  block_id: string | null;
  label: string;
  archived_at: Date | string | null;
  created_at: Date | string;
};

type DbErrorLike = Error & {
  code?: string;
  constraint?: string;
};

export type BlockItem = {
  id: string;
  instanceId: string;
  label: string;
  archivedAt: string | null;
  createdAt: string;
};

export type UnitItem = {
  id: string;
  instanceId: string;
  blockId: string | null;
  label: string;
  archivedAt: string | null;
  createdAt: string;
};

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

function mapBlock(row: BlockRow): BlockItem {
  return {
    id: row.id,
    instanceId: row.instance_id,
    label: row.label,
    archivedAt: row.archived_at ? toIso(row.archived_at) : null,
    createdAt: toIso(row.created_at),
  };
}

function mapUnit(row: UnitRow): UnitItem {
  return {
    id: row.id,
    instanceId: row.instance_id,
    blockId: row.block_id,
    label: row.label,
    archivedAt: row.archived_at ? toIso(row.archived_at) : null,
    createdAt: toIso(row.created_at),
  };
}

function normalizeUniqueConflict(error: unknown): AppError | null {
  const dbError = error as DbErrorLike;
  if (dbError?.code !== '23505') {
    return null;
  }

  if (dbError.constraint?.includes('blocks') || dbError.constraint?.includes('ux_blocks_instance_label_active')) {
    return new AppError(409, 'BLOCK_LABEL_CONFLICT', 'Block label already exists for this instance');
  }

  if (dbError.constraint?.includes('units') || dbError.constraint?.includes('ux_units_instance_label_active')) {
    return new AppError(409, 'UNIT_LABEL_CONFLICT', 'Unit label already exists for this instance');
  }

  return null;
}

function buildListWhereSql(includeArchived: boolean): string {
  if (includeArchived) {
    return 'where instance_id = $1';
  }

  return 'where instance_id = $1 and archived_at is null';
}

export async function listBlocks(
  instanceId: string,
  query: StructureListQuery,
): Promise<PaginatedResponse<BlockItem>> {
  try {
    const whereSql = buildListWhereSql(query.includeArchived);

    const countResult = await getDbPool().query<TotalRow>(
      `
      select count(*)::bigint as total
      from public.blocks
      ${whereSql}
      `,
      [instanceId],
    );

    const offset = (query.page - 1) * query.limit;
    const dataResult = await getDbPool().query<BlockRow>(
      `
      select id, instance_id, label, archived_at, created_at
      from public.blocks
      ${whereSql}
      order by created_at desc, id desc
      limit $2
      offset $3
      `,
      [instanceId, query.limit, offset],
    );

    const total = countResult.rows[0] ? Number.parseInt(countResult.rows[0].total, 10) : 0;

    return {
      items: dataResult.rows.map(mapBlock),
      total: Number.isNaN(total) ? 0 : total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    console.error('[STRUCTURE_REPO] listBlocks failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to list blocks');
  }
}

export async function getBlockById(instanceId: string, blockId: string): Promise<BlockItem | null> {
  try {
    const result = await getDbPool().query<BlockRow>(
      `
      select id, instance_id, label, archived_at, created_at
      from public.blocks
      where instance_id = $1
        and id = $2
      limit 1
      `,
      [instanceId, blockId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBlock(result.rows[0]);
  } catch (error) {
    console.error('[STRUCTURE_REPO] getBlockById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load block');
  }
}

export async function createBlock(instanceId: string, input: CreateBlockInput): Promise<BlockItem> {
  try {
    const result = await getDbPool().query<BlockRow>(
      `
      insert into public.blocks (instance_id, label, name, created_at, updated_at)
      values ($1, $2, $2, now(), now())
      returning id, instance_id, label, archived_at, created_at
      `,
      [instanceId, input.label],
    );

    return mapBlock(result.rows[0]);
  } catch (error) {
    const conflict = normalizeUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[STRUCTURE_REPO] createBlock failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create block');
  }
}

export async function updateBlock(
  instanceId: string,
  blockId: string,
  input: PatchBlockInput,
): Promise<BlockItem | null> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [instanceId, blockId];

    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (input.label !== undefined) {
      const labelBind = bind(input.label);
      setClauses.push(`label = ${labelBind}`);
      setClauses.push(`name = ${labelBind}`);
    }

    if (setClauses.length === 0) {
      throw Errors.validationError({ body: 'No fields to update' });
    }

    setClauses.push('updated_at = now()');

    const result = await getDbPool().query<BlockRow>(
      `
      update public.blocks
      set ${setClauses.join(', ')}
      where instance_id = $1
        and id = $2
        and archived_at is null
      returning id, instance_id, label, archived_at, created_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBlock(result.rows[0]);
  } catch (error) {
    const conflict = normalizeUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[STRUCTURE_REPO] updateBlock failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update block');
  }
}

export async function archiveBlock(instanceId: string, blockId: string): Promise<BlockItem | null> {
  try {
    const result = await getDbPool().query<BlockRow>(
      `
      update public.blocks
      set archived_at = now(), updated_at = now()
      where instance_id = $1
        and id = $2
        and archived_at is null
      returning id, instance_id, label, archived_at, created_at
      `,
      [instanceId, blockId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapBlock(result.rows[0]);
  } catch (error) {
    console.error('[STRUCTURE_REPO] archiveBlock failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to archive block');
  }
}

export async function listUnits(
  instanceId: string,
  query: StructureListQuery,
): Promise<PaginatedResponse<UnitItem>> {
  try {
    const whereSql = buildListWhereSql(query.includeArchived);

    const countResult = await getDbPool().query<TotalRow>(
      `
      select count(*)::bigint as total
      from public.units
      ${whereSql}
      `,
      [instanceId],
    );

    const offset = (query.page - 1) * query.limit;
    const dataResult = await getDbPool().query<UnitRow>(
      `
      select id, instance_id, block_id, label, archived_at, created_at
      from public.units
      ${whereSql}
      order by created_at desc, id desc
      limit $2
      offset $3
      `,
      [instanceId, query.limit, offset],
    );

    const total = countResult.rows[0] ? Number.parseInt(countResult.rows[0].total, 10) : 0;

    return {
      items: dataResult.rows.map(mapUnit),
      total: Number.isNaN(total) ? 0 : total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    console.error('[STRUCTURE_REPO] listUnits failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to list units');
  }
}

export async function getUnitById(instanceId: string, unitId: string): Promise<UnitItem | null> {
  try {
    const result = await getDbPool().query<UnitRow>(
      `
      select id, instance_id, block_id, label, archived_at, created_at
      from public.units
      where instance_id = $1
        and id = $2
      limit 1
      `,
      [instanceId, unitId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUnit(result.rows[0]);
  } catch (error) {
    console.error('[STRUCTURE_REPO] getUnitById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load unit');
  }
}

export async function createUnit(instanceId: string, input: CreateUnitInput): Promise<UnitItem> {
  try {
    const result = await getDbPool().query<UnitRow>(
      `
      insert into public.units (instance_id, block_id, label, number, created_at, updated_at)
      values ($1, $2, $3, $3, now(), now())
      returning id, instance_id, block_id, label, archived_at, created_at
      `,
      [instanceId, input.blockId ?? null, input.label],
    );

    return mapUnit(result.rows[0]);
  } catch (error) {
    const conflict = normalizeUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[STRUCTURE_REPO] createUnit failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create unit');
  }
}

export async function updateUnit(
  instanceId: string,
  unitId: string,
  input: PatchUnitInput,
): Promise<UnitItem | null> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [instanceId, unitId];

    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (input.label !== undefined) {
      const labelBind = bind(input.label);
      setClauses.push(`label = ${labelBind}`);
      setClauses.push(`number = ${labelBind}`);
    }

    if (input.blockId !== undefined) {
      setClauses.push(`block_id = ${bind(input.blockId)}`);
    }

    if (setClauses.length === 0) {
      throw Errors.validationError({ body: 'No fields to update' });
    }

    setClauses.push('updated_at = now()');

    const result = await getDbPool().query<UnitRow>(
      `
      update public.units
      set ${setClauses.join(', ')}
      where instance_id = $1
        and id = $2
        and archived_at is null
      returning id, instance_id, block_id, label, archived_at, created_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUnit(result.rows[0]);
  } catch (error) {
    const conflict = normalizeUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[STRUCTURE_REPO] updateUnit failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update unit');
  }
}

export async function archiveUnit(instanceId: string, unitId: string): Promise<UnitItem | null> {
  try {
    const result = await getDbPool().query<UnitRow>(
      `
      update public.units
      set archived_at = now(), updated_at = now()
      where instance_id = $1
        and id = $2
        and archived_at is null
      returning id, instance_id, block_id, label, archived_at, created_at
      `,
      [instanceId, unitId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUnit(result.rows[0]);
  } catch (error) {
    console.error('[STRUCTURE_REPO] archiveUnit failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to archive unit');
  }
}
