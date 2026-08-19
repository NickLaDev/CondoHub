import { PoolClient } from 'pg';
import { PaginatedResponse } from '../../core/contract/pagination';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { withTx } from '../../db/tx';
import {
  CreateResidentInput,
  CreateStaffInput,
  PatchResidentInput,
  PatchStaffInput,
  StaffRole,
  TenantUsersListQuery,
} from './dto';

type DbErrorLike = Error & {
  code?: string;
  constraint?: string;
};

type TotalRow = {
  total: string;
};

type UserRow = {
  id: string;
  instance_id: string | null;
  unit_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  status: string;
  token_version: number;
  created_at: Date | string;
  updated_at: Date | string;
  disabled_at: Date | string | null;
};

type UnitExistsRow = {
  id: string;
};

export type TenantUser = {
  id: string;
  instanceId: string | null;
  unitId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  status: string;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
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

function mapUser(row: UserRow): TenantUser {
  return {
    id: row.id,
    instanceId: row.instance_id,
    unitId: row.unit_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    roles: row.roles,
    status: row.status,
    tokenVersion: row.token_version,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    disabledAt: row.disabled_at ? toIso(row.disabled_at) : null,
  };
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
}

function normalizePhone(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeUsersUniqueConflict(error: unknown): AppError | null {
  const dbError = error as DbErrorLike;
  if (dbError?.code !== '23505') {
    return null;
  }

  if (dbError.constraint?.includes('ux_users_instance_email')) {
    return new AppError(409, 'USER_EMAIL_CONFLICT', 'Email already exists in this instance');
  }

  return null;
}

function buildListFilters(
  instanceId: string,
  mode: 'resident' | 'staff',
  query: TenantUsersListQuery,
): {
  whereSql: string;
  params: unknown[];
} {
  const params: unknown[] = [instanceId];
  const clauses: string[] = [];

  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  clauses.push('u.instance_id = $1');
  clauses.push('cardinality(u.roles) = 1');
  if (mode === 'resident') {
    clauses.push(`u.roles[1] = ${bind('MORADOR')}`);
  } else {
    clauses.push(`u.roles[1] = any(array[${bind('FUNC_ENTREGAS')}, ${bind('FUNC_MANUTENCAO')}]::text[])`);
  }

  if (query.status) {
    clauses.push(`u.status = ${bind(query.status)}`);
  }

  if (query.q) {
    const pattern = `%${query.q}%`;
    const searchBind = bind(pattern);
    clauses.push(
      `(u.name ilike ${searchBind} or coalesce(u.email, '') ilike ${searchBind} or coalesce(u.phone, '') ilike ${searchBind})`,
    );
  }

  return {
    whereSql: `where ${clauses.join(' and ')}`,
    params,
  };
}

async function listUsers(
  instanceId: string,
  query: TenantUsersListQuery,
  mode: 'resident' | 'staff',
): Promise<PaginatedResponse<TenantUser>> {
  try {
    const built = buildListFilters(instanceId, mode, query);

    const countResult = await getDbPool().query<TotalRow>(
      `
      select count(*)::bigint as total
      from public.users u
      ${built.whereSql}
      `,
      built.params,
    );

    const dataParams = [...built.params, query.limit, (query.page - 1) * query.limit];
    const limitBind = `$${dataParams.length - 1}`;
    const offsetBind = `$${dataParams.length}`;

    const dataResult = await getDbPool().query<UserRow>(
      `
      select
        u.id,
        u.instance_id,
        u.unit_id,
        u.name,
        u.email,
        u.phone,
        u.roles,
        u.status,
        u.token_version,
        u.created_at,
        u.updated_at,
        u.disabled_at
      from public.users u
      ${built.whereSql}
      order by u.created_at desc, u.id desc
      limit ${limitBind}
      offset ${offsetBind}
      `,
      dataParams,
    );

    const total = countResult.rows[0] ? Number.parseInt(countResult.rows[0].total, 10) : 0;

    return {
      items: dataResult.rows.map(mapUser),
      total: Number.isNaN(total) ? 0 : total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    console.error('[USERS_REPO] listUsers failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to list users');
  }
}

async function ensureActiveUnit(client: PoolClient, instanceId: string, unitId: string): Promise<void> {
  const result = await client.query<UnitExistsRow>(
    `
    select u.id
    from public.units u
    where u.instance_id = $1
      and u.id = $2
      and u.archived_at is null
    limit 1
    `,
    [instanceId, unitId],
  );

  if (result.rowCount === 0) {
    throw new AppError(400, 'UNIT_NOT_FOUND', 'Unit not found or archived');
  }
}

async function upsertCredential(client: PoolClient, userId: string, password: string): Promise<void> {
  await client.query(
    `
    insert into public.user_credentials (
      user_id,
      password_hash,
      password_updated_at,
      created_at,
      updated_at
    )
    values ($1, crypt($2, gen_salt('bf')), now(), now(), now())
    on conflict (user_id)
    do update set
      password_hash = excluded.password_hash,
      password_updated_at = now(),
      updated_at = now()
    `,
    [userId, password],
  );
}

async function insertTenantUser(
  client: PoolClient,
  params: {
    instanceId: string;
    unitId: string | null;
    role: string;
    name: string;
    email: string | null;
    phone: string | null;
  },
): Promise<TenantUser> {
  const result = await client.query<UserRow>(
    `
    insert into public.users (
      instance_id,
      unit_id,
      name,
      email,
      phone,
      roles,
      status,
      token_version,
      created_at,
      updated_at
    )
    values ($1, $2, $3, $4, $5, array[$6]::text[], 'ACTIVE', 1, now(), now())
    returning
      id,
      instance_id,
      unit_id,
      name,
      email,
      phone,
      roles,
      status,
      token_version,
      created_at,
      updated_at,
      disabled_at
    `,
    [params.instanceId, params.unitId, params.name, params.email, params.phone, params.role],
  );

  return mapUser(result.rows[0]);
}

export async function listResidents(
  instanceId: string,
  query: TenantUsersListQuery,
): Promise<PaginatedResponse<TenantUser>> {
  return listUsers(instanceId, query, 'resident');
}

export async function listStaff(
  instanceId: string,
  query: TenantUsersListQuery,
): Promise<PaginatedResponse<TenantUser>> {
  return listUsers(instanceId, query, 'staff');
}

export async function getTenantUserById(instanceId: string, userId: string): Promise<TenantUser | null> {
  try {
    const result = await getDbPool().query<UserRow>(
      `
      select
        u.id,
        u.instance_id,
        u.unit_id,
        u.name,
        u.email,
        u.phone,
        u.roles,
        u.status,
        u.token_version,
        u.created_at,
        u.updated_at,
        u.disabled_at
      from public.users u
      where u.instance_id = $1
        and u.id = $2
      limit 1
      `,
      [instanceId, userId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  } catch (error) {
    console.error('[USERS_REPO] getTenantUserById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load user');
  }
}

export async function createResident(instanceId: string, input: CreateResidentInput): Promise<TenantUser> {
  try {
    return await withTx(async (client) => {
      await ensureActiveUnit(client, instanceId, input.unitId);

      const created = await insertTenantUser(client, {
        instanceId,
        unitId: input.unitId,
        role: 'MORADOR',
        name: input.name,
        email: normalizeEmail(input.email),
        phone: normalizePhone(input.phone),
      });

      await upsertCredential(client, created.id, input.password);
      return created;
    });
  } catch (error) {
    const conflict = normalizeUsersUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[USERS_REPO] createResident failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create resident');
  }
}

export async function createStaff(instanceId: string, input: CreateStaffInput): Promise<TenantUser> {
  try {
    return await withTx(async (client) => {
      const created = await insertTenantUser(client, {
        instanceId,
        unitId: null,
        role: input.role,
        name: input.name,
        email: normalizeEmail(input.email),
        phone: normalizePhone(input.phone),
      });

      await upsertCredential(client, created.id, input.password);
      return created;
    });
  } catch (error) {
    const conflict = normalizeUsersUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[USERS_REPO] createStaff failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create staff user');
  }
}

export async function updateResident(
  instanceId: string,
  userId: string,
  input: PatchResidentInput,
): Promise<TenantUser | null> {
  try {
    return await withTx(async (client) => {
      if (input.unitId) {
        await ensureActiveUnit(client, instanceId, input.unitId);
      }

      const setClauses: string[] = [];
      const params: unknown[] = [instanceId, userId];

      const bind = (value: unknown): string => {
        params.push(value);
        return `$${params.length}`;
      };

      if (input.name !== undefined) {
        setClauses.push(`name = ${bind(input.name)}`);
      }

      if (input.email !== undefined) {
        setClauses.push(`email = ${bind(normalizeEmail(input.email))}`);
      }

      if (input.phone !== undefined) {
        setClauses.push(`phone = ${bind(normalizePhone(input.phone))}`);
      }

      if (input.unitId !== undefined) {
        setClauses.push(`unit_id = ${bind(input.unitId)}`);
      }

      if (setClauses.length === 0) {
        throw Errors.validationError({ body: 'No fields to update' });
      }

      setClauses.push('updated_at = now()');

      const result = await client.query<UserRow>(
        `
        update public.users
        set ${setClauses.join(', ')}
        where instance_id = $1
          and id = $2
        returning
          id,
          instance_id,
          unit_id,
          name,
          email,
          phone,
          roles,
          status,
          token_version,
          created_at,
          updated_at,
          disabled_at
        `,
        params,
      );

      if (result.rowCount === 0) {
        return null;
      }

      return mapUser(result.rows[0]);
    });
  } catch (error) {
    const conflict = normalizeUsersUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[USERS_REPO] updateResident failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update resident');
  }
}

export async function updateStaff(
  instanceId: string,
  userId: string,
  input: PatchStaffInput,
): Promise<TenantUser | null> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [instanceId, userId];

    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (input.name !== undefined) {
      setClauses.push(`name = ${bind(input.name)}`);
    }

    if (input.email !== undefined) {
      setClauses.push(`email = ${bind(normalizeEmail(input.email))}`);
    }

    if (input.phone !== undefined) {
      setClauses.push(`phone = ${bind(normalizePhone(input.phone))}`);
    }

    if (input.role !== undefined) {
      setClauses.push(`roles = array[${bind(input.role)}]::text[]`);
    }

    if (setClauses.length === 0) {
      throw Errors.validationError({ body: 'No fields to update' });
    }

    setClauses.push('updated_at = now()');

    const result = await getDbPool().query<UserRow>(
      `
      update public.users
      set ${setClauses.join(', ')}
      where instance_id = $1
        and id = $2
      returning
        id,
        instance_id,
        unit_id,
        name,
        email,
        phone,
        roles,
        status,
        token_version,
        created_at,
        updated_at,
        disabled_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapUser(result.rows[0]);
  } catch (error) {
    const conflict = normalizeUsersUniqueConflict(error);
    if (conflict) {
      throw conflict;
    }

    console.error('[USERS_REPO] updateStaff failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update staff user');
  }
}

export async function disableTenantUser(instanceId: string, userId: string): Promise<TenantUser | null> {
  try {
    return await withTx(async (client) => {
      const result = await client.query<UserRow>(
        `
        update public.users
        set
          status = 'DISABLED',
          disabled_at = coalesce(disabled_at, now()),
          token_version = token_version + 1,
          updated_at = now()
        where instance_id = $1
          and id = $2
          and status = 'ACTIVE'
        returning
          id,
          instance_id,
          unit_id,
          name,
          email,
          phone,
          roles,
          status,
          token_version,
          created_at,
          updated_at,
          disabled_at
        `,
        [instanceId, userId],
      );

      if (result.rowCount === 0) {
        return null;
      }

      await client.query(
        `
        update public.sessions
        set revoked_at = now()
        where instance_id = $1
          and user_id = $2
          and revoked_at is null
        `,
        [instanceId, userId],
      );

      return mapUser(result.rows[0]);
    });
  } catch (error) {
    console.error('[USERS_REPO] disableTenantUser failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to disable user');
  }
}

export function isResident(user: TenantUser): boolean {
  return user.roles.length === 1 && user.roles[0] === 'MORADOR';
}

export function isStaff(user: TenantUser): user is TenantUser & { roles: [StaffRole] } {
  if (user.roles.length !== 1) {
    return false;
  }
  return user.roles[0] === 'FUNC_ENTREGAS' || user.roles[0] === 'FUNC_MANUTENCAO';
}
