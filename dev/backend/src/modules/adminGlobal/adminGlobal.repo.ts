import { PoolClient } from 'pg';
import { PaginatedResponse } from '../../core/contract/pagination';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { withTx } from '../../db/tx';
import {
  AdminInstanceSortField,
  AdminInstancesListQuery,
  AdminPlanSortField,
  AdminPlansListQuery,
  CreateAdminInstanceInput,
  CreateAdminPlanInput,
  UpdateAdminInstanceInput,
  UpdateAdminPlanInput,
} from './adminGlobal.dto';

const INSTANCE_SORT_COLUMN_MAP: Record<AdminInstanceSortField, string> = {
  created_at: 'i.created_at',
  updated_at: 'i.updated_at',
  name: 'i.name',
  instance_key: 'i.instance_key',
  status: 'i.status',
};

const PLAN_SORT_COLUMN_MAP: Record<AdminPlanSortField, string> = {
  created_at: 'p.created_at',
  name: 'p.name',
  price_cents: 'p.price_cents',
  currency: 'p.currency',
  archived_at: 'p.archived_at',
};

type CountRow = {
  total: string;
};

type InstanceRow = {
  id: string;
  instance_key: string;
  name: string;
  status: string;
  plan_id: string | null;
  suspended_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type PlanRow = {
  id: string;
  name: string;
  features: unknown;
  limits: unknown;
  price_cents: number | string | null;
  currency: string | null;
  archived_at: Date | string | null;
  created_at: Date | string;
};

type StatsRow = {
  instances_total: string;
  instances_active: string;
  instances_suspended: string;
  plans_total: string;
  plans_active: string;
  plans_archived: string;
  users_total: string;
  users_admin_global: string;
  users_tenant: string;
};

type UserRow = {
  id: string;
  instance_id: string | null;
  name: string;
  email: string | null;
  roles: string[];
  status: string;
};

type UpdatedTokenRow = {
  token_version: number;
};

type IdRow = {
  id: string;
};

export type AdminInstance = {
  id: string;
  instanceKey: string;
  name: string;
  status: string;
  planId: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPlan = {
  id: string;
  name: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  priceCents: number | null;
  currency: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type AdminStats = {
  instances: {
    total: number;
    active: number;
    suspended: number;
  };
  plans: {
    total: number;
    active: number;
    archived: number;
  };
  users: {
    total: number;
    adminGlobal: number;
    tenant: number;
  };
};

export type SupportSindicoUser = {
  id: string;
  instanceId: string;
  name: string;
  email: string | null;
  roles: string[];
  status: string;
};

function toIsoString(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return String(value);
}

function toNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toCount(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function mapInstance(row: InstanceRow): AdminInstance {
  return {
    id: row.id,
    instanceKey: row.instance_key,
    name: row.name,
    status: row.status,
    planId: row.plan_id,
    suspendedAt: toIsoString(row.suspended_at),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapPlan(row: PlanRow): AdminPlan {
  return {
    id: row.id,
    name: row.name,
    features: normalizeJsonObject(row.features),
    limits: normalizeJsonObject(row.limits),
    priceCents: toNumber(row.price_cents),
    currency: row.currency,
    archivedAt: toIsoString(row.archived_at),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function mapSupportUser(row: UserRow): SupportSindicoUser | null {
  if (!row.instance_id) {
    return null;
  }

  return {
    id: row.id,
    instanceId: row.instance_id,
    name: row.name,
    email: row.email,
    roles: row.roles,
    status: row.status,
  };
}

function addFilter(
  clauses: string[],
  params: unknown[],
  sql: string,
  value: unknown,
): void {
  params.push(value);
  clauses.push(sql.replace('?', `$${params.length}`));
}

export async function adminInstanceKeyExists(instanceKey: string): Promise<boolean> {
  try {
    const result = await getDbPool().query(
      `
      select 1
      from public.instances
      where instance_key = $1
      limit 1
      `,
      [instanceKey],
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] adminInstanceKeyExists failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to check instance key');
  }
}

export async function listAdminInstances(
  query: AdminInstancesListQuery,
): Promise<PaginatedResponse<AdminInstance>> {
  try {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      addFilter(clauses, params, 'i.status = ?', query.status);
    }

    if (query.planId) {
      addFilter(clauses, params, 'i.plan_id = ?', query.planId);
    }

    if (query.q) {
      params.push(`%${query.q}%`);
      const qBind = `$${params.length}`;
      clauses.push(`(i.name ilike ${qBind} or i.instance_key ilike ${qBind})`);
    }

    const whereSql = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';
    const sortColumn = INSTANCE_SORT_COLUMN_MAP[query.sort];
    const orderDirection = query.order === 'asc' ? 'asc' : 'desc';

    const countResult = await getDbPool().query<CountRow>(
      `
      select count(*)::bigint as total
      from public.instances i
      ${whereSql}
      `,
      params,
    );

    const dataParams = [...params];
    dataParams.push(query.limit);
    const limitBind = `$${dataParams.length}`;
    dataParams.push((query.page - 1) * query.limit);
    const offsetBind = `$${dataParams.length}`;

    const dataResult = await getDbPool().query<InstanceRow>(
      `
      select
        i.id,
        i.instance_key,
        i.name,
        i.status,
        i.plan_id,
        i.suspended_at,
        i.created_at,
        i.updated_at
      from public.instances i
      ${whereSql}
      order by ${sortColumn} ${orderDirection} nulls last, i.id ${orderDirection}
      limit ${limitBind}
      offset ${offsetBind}
      `,
      dataParams,
    );

    const total = countResult.rows[0] ? toCount(countResult.rows[0].total) : 0;

    return {
      items: dataResult.rows.map(mapInstance),
      total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] listAdminInstances failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to list instances');
  }
}

export async function createAdminInstance(input: CreateAdminInstanceInput): Promise<AdminInstance> {
  try {
    const result = await getDbPool().query<InstanceRow>(
      `
      insert into public.instances (
        instance_key,
        name,
        status,
        plan_id,
        suspended_at,
        created_at,
        updated_at
      )
      values ($1, $2, 'ACTIVE', $3, null, now(), now())
      returning
        id,
        instance_key,
        name,
        status,
        plan_id,
        suspended_at,
        created_at,
        updated_at
      `,
      [input.instanceKey, input.name, input.planId ?? null],
    );

    return mapInstance(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] createAdminInstance failed', formatDbError(error));

    const pgError = error as Error & { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint?.includes('instance_key')) {
      throw new AppError(409, 'INSTANCE_KEY_CONFLICT', 'Instance key already exists');
    }
    if (pgError.code === '23503' && pgError.constraint?.includes('plan')) {
      throw Errors.validationError({ planId: 'Plan not found' });
    }

    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create instance');
  }
}

export async function getAdminInstanceById(instanceId: string): Promise<AdminInstance | null> {
  try {
    const result = await getDbPool().query<InstanceRow>(
      `
      select
        i.id,
        i.instance_key,
        i.name,
        i.status,
        i.plan_id,
        i.suspended_at,
        i.created_at,
        i.updated_at
      from public.instances i
      where i.id = $1
      limit 1
      `,
      [instanceId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInstance(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] getAdminInstanceById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load instance');
  }
}

export async function updateAdminInstance(
  instanceId: string,
  input: UpdateAdminInstanceInput,
): Promise<AdminInstance | null> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      params.push(input.name);
      setClauses.push(`name = $${params.length}`);
    }

    if (input.planId !== undefined) {
      params.push(input.planId);
      setClauses.push(`plan_id = $${params.length}`);
    }

    params.push(instanceId);
    const idBind = `$${params.length}`;
    setClauses.push('updated_at = now()');

    const result = await getDbPool().query<InstanceRow>(
      `
      update public.instances
      set ${setClauses.join(', ')}
      where id = ${idBind}
      returning
        id,
        instance_key,
        name,
        status,
        plan_id,
        suspended_at,
        created_at,
        updated_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInstance(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] updateAdminInstance failed', formatDbError(error));
    const pgError = error as Error & { code?: string; constraint?: string };
    if (pgError.code === '23503' && pgError.constraint?.includes('plan')) {
      throw Errors.validationError({ planId: 'Plan not found' });
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update instance');
  }
}

export async function setAdminInstanceStatus(
  instanceId: string,
  status: 'ACTIVE' | 'SUSPENDED',
): Promise<AdminInstance | null> {
  try {
    const result = await getDbPool().query<InstanceRow>(
      `
      update public.instances
      set
        status = $2,
        suspended_at = case when $2 = 'SUSPENDED' then coalesce(suspended_at, now()) else null end,
        updated_at = now()
      where id = $1
      returning
        id,
        instance_key,
        name,
        status,
        plan_id,
        suspended_at,
        created_at,
        updated_at
      `,
      [instanceId, status],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInstance(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] setAdminInstanceStatus failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update instance status');
  }
}

export async function listAdminPlans(query: AdminPlansListQuery): Promise<PaginatedResponse<AdminPlan>> {
  try {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.archived === true) {
      clauses.push('p.archived_at is not null');
    } else if (query.archived === false) {
      clauses.push('p.archived_at is null');
    }

    if (query.q) {
      addFilter(clauses, params, 'p.name ilike ?', `%${query.q}%`);
    }

    const whereSql = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';
    const sortColumn = PLAN_SORT_COLUMN_MAP[query.sort];
    const orderDirection = query.order === 'asc' ? 'asc' : 'desc';

    const countResult = await getDbPool().query<CountRow>(
      `
      select count(*)::bigint as total
      from public.plans p
      ${whereSql}
      `,
      params,
    );

    const dataParams = [...params];
    dataParams.push(query.limit);
    const limitBind = `$${dataParams.length}`;
    dataParams.push((query.page - 1) * query.limit);
    const offsetBind = `$${dataParams.length}`;

    const dataResult = await getDbPool().query<PlanRow>(
      `
      select
        p.id,
        p.name,
        p.features,
        p.limits,
        p.price_cents,
        p.currency,
        p.archived_at,
        p.created_at
      from public.plans p
      ${whereSql}
      order by ${sortColumn} ${orderDirection} nulls last, p.id ${orderDirection}
      limit ${limitBind}
      offset ${offsetBind}
      `,
      dataParams,
    );

    const total = countResult.rows[0] ? toCount(countResult.rows[0].total) : 0;

    return {
      items: dataResult.rows.map(mapPlan),
      total,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] listAdminPlans failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to list plans');
  }
}

export async function createAdminPlan(input: CreateAdminPlanInput): Promise<AdminPlan> {
  try {
    const result = await getDbPool().query<PlanRow>(
      `
      insert into public.plans (
        name,
        features,
        limits,
        price_cents,
        currency,
        archived_at,
        created_at
      )
      values ($1, $2::jsonb, $3::jsonb, $4, $5, null, now())
      returning
        id,
        name,
        features,
        limits,
        price_cents,
        currency,
        archived_at,
        created_at
      `,
      [
        input.name,
        JSON.stringify(input.features ?? {}),
        JSON.stringify(input.limits ?? {}),
        input.priceCents ?? null,
        input.currency ?? null,
      ],
    );

    return mapPlan(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] createAdminPlan failed', formatDbError(error));
    const pgError = error as Error & { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint?.includes('name')) {
      throw new AppError(409, 'PLAN_NAME_CONFLICT', 'Plan name already exists');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to create plan');
  }
}

export async function getAdminPlanById(planId: string): Promise<AdminPlan | null> {
  try {
    const result = await getDbPool().query<PlanRow>(
      `
      select
        p.id,
        p.name,
        p.features,
        p.limits,
        p.price_cents,
        p.currency,
        p.archived_at,
        p.created_at
      from public.plans p
      where p.id = $1
      limit 1
      `,
      [planId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPlan(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] getAdminPlanById failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load plan');
  }
}

export async function updateAdminPlan(planId: string, input: UpdateAdminPlanInput): Promise<AdminPlan | null> {
  try {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      params.push(input.name);
      setClauses.push(`name = $${params.length}`);
    }

    if (input.features !== undefined) {
      params.push(JSON.stringify(input.features));
      setClauses.push(`features = $${params.length}::jsonb`);
    }

    if (input.limits !== undefined) {
      params.push(JSON.stringify(input.limits));
      setClauses.push(`limits = $${params.length}::jsonb`);
    }

    if (input.priceCents !== undefined) {
      params.push(input.priceCents);
      setClauses.push(`price_cents = $${params.length}`);
    }

    if (input.currency !== undefined) {
      params.push(input.currency);
      setClauses.push(`currency = $${params.length}`);
    }

    params.push(planId);
    const idBind = `$${params.length}`;

    const result = await getDbPool().query<PlanRow>(
      `
      update public.plans
      set ${setClauses.join(', ')}
      where id = ${idBind}
      returning
        id,
        name,
        features,
        limits,
        price_cents,
        currency,
        archived_at,
        created_at
      `,
      params,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPlan(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] updateAdminPlan failed', formatDbError(error));
    const pgError = error as Error & { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint?.includes('name')) {
      throw new AppError(409, 'PLAN_NAME_CONFLICT', 'Plan name already exists');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to update plan');
  }
}

export async function archiveAdminPlan(planId: string): Promise<AdminPlan | null> {
  try {
    const result = await getDbPool().query<PlanRow>(
      `
      update public.plans
      set archived_at = coalesce(archived_at, now())
      where id = $1
      returning
        id,
        name,
        features,
        limits,
        price_cents,
        currency,
        archived_at,
        created_at
      `,
      [planId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPlan(result.rows[0]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] archiveAdminPlan failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to archive plan');
  }
}

export async function listInstanceIdsByPlanId(planId: string): Promise<string[]> {
  try {
    const result = await getDbPool().query<IdRow>(
      `
      select i.id
      from public.instances i
      where i.plan_id = $1
      `,
      [planId],
    );

    return result.rows.map((row) => row.id);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] listInstanceIdsByPlanId failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load instances for plan');
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const result = await getDbPool().query<StatsRow>(
      `
      select
        (select count(*)::bigint from public.instances) as instances_total,
        (select count(*)::bigint from public.instances where status = 'ACTIVE') as instances_active,
        (select count(*)::bigint from public.instances where status = 'SUSPENDED') as instances_suspended,
        (select count(*)::bigint from public.plans) as plans_total,
        (select count(*)::bigint from public.plans where archived_at is null) as plans_active,
        (select count(*)::bigint from public.plans where archived_at is not null) as plans_archived,
        (select count(*)::bigint from public.users) as users_total,
        (select count(*)::bigint from public.users where instance_id is null) as users_admin_global,
        (select count(*)::bigint from public.users where instance_id is not null) as users_tenant
      `,
    );

    const row = result.rows[0];
    return {
      instances: {
        total: toCount(row.instances_total),
        active: toCount(row.instances_active),
        suspended: toCount(row.instances_suspended),
      },
      plans: {
        total: toCount(row.plans_total),
        active: toCount(row.plans_active),
        archived: toCount(row.plans_archived),
      },
      users: {
        total: toCount(row.users_total),
        adminGlobal: toCount(row.users_admin_global),
        tenant: toCount(row.users_tenant),
      },
    };
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] getAdminStats failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load admin stats');
  }
}

async function querySupportUserBy(
  conditionSql: string,
  values: unknown[],
): Promise<SupportSindicoUser | null> {
  const result = await getDbPool().query<UserRow>(
    `
    select
      u.id,
      u.instance_id,
      u.name,
      u.email,
      u.roles,
      u.status
    from public.users u
    where ${conditionSql}
    limit 1
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapSupportUser(result.rows[0]);
}

export async function findSupportSindicoByUserId(
  instanceId: string,
  userId: string,
): Promise<SupportSindicoUser | null> {
  try {
    return await querySupportUserBy('u.instance_id = $1 and u.id = $2', [instanceId, userId]);
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] findSupportSindicoByUserId failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load target user');
  }
}

export async function findSupportSindicoByEmail(
  instanceId: string,
  email: string,
): Promise<SupportSindicoUser | null> {
  try {
    return await querySupportUserBy(
      'u.instance_id = $1 and lower(u.email) = lower($2)',
      [instanceId, email],
    );
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] findSupportSindicoByEmail failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to load target user');
  }
}

async function upsertCredential(client: PoolClient, userId: string, newPassword: string): Promise<void> {
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
    [userId, newPassword],
  );
}

async function incrementTokenVersion(client: PoolClient, userId: string): Promise<number> {
  const updated = await client.query<UpdatedTokenRow>(
    `
    update public.users
    set token_version = token_version + 1, updated_at = now()
    where id = $1
    returning token_version
    `,
    [userId],
  );

  if (updated.rowCount === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return updated.rows[0].token_version;
}

async function revokeOpenSessions(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `
    update public.sessions
    set revoked_at = now()
    where user_id = $1
      and revoked_at is null
    `,
    [userId],
  );
}

export async function resetSupportUserCredential(params: {
  userId: string;
  newPassword: string;
}): Promise<{ tokenVersion: number }> {
  try {
    return withTx(async (client) => {
      await upsertCredential(client, params.userId, params.newPassword);
      const tokenVersion = await incrementTokenVersion(client, params.userId);
      await revokeOpenSessions(client, params.userId);

      return { tokenVersion };
    });
  } catch (error) {
    console.error('[ADMIN_GLOBAL_REPO] resetSupportUserCredential failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to reset support credential');
  }
}
