import { PaginatedResponse } from '../../core/contract/pagination';
import { AppError, Errors } from '../../core/contract/errors';
import { formatDbError, getDbPool } from '../../db/pool';
import { AdminLogsQuery, AuditSortField, TenantLogsQuery } from './audit.query';

const AUDIT_SORT_COLUMN_MAP: Record<AuditSortField, string> = {
  created_at: 'al.created_at',
  action: 'al.action',
  unit_id: 'al.unit_id',
  actor_user_id: 'al.actor_user_id',
};

type TotalRow = {
  total: string;
};

type AuditLogRow = {
  id: string;
  instanceId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  unitId: string | null;
  actorUserId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: unknown;
  createdAt: Date | string;
};

export type AuditLogItem = {
  id: string;
  instanceId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  unitId: string | null;
  actorUserId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CreateAuditLogInput = {
  instanceId: string;
  action: string;
  targetType: string;
  targetId?: string;
  unitId: string | null;
  actorUserId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
};

type AuditWhereFilters = {
  instanceId?: string;
  action?: string;
  unitId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  q?: string;
};

type QueryAuditLogsInput = {
  page: number;
  limit: number;
  sort: AuditSortField;
  order: 'asc' | 'desc';
  filters: AuditWhereFilters;
};

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toIsoDateString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return String(value);
}

function mapAuditLogRow(row: AuditLogRow): AuditLogItem {
  return {
    id: row.id,
    instanceId: row.instanceId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    unitId: row.unitId,
    actorUserId: row.actorUserId,
    ip: row.ip,
    userAgent: row.userAgent,
    requestId: row.requestId,
    metadata: normalizeMetadata(row.metadata),
    createdAt: toIsoDateString(row.createdAt),
  };
}

function buildWhereClause(filters: AuditWhereFilters): { whereSql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.instanceId) {
    clauses.push(`al.instance_id = ${bind(filters.instanceId)}`);
  }

  if (filters.action) {
    clauses.push(`al.action = ${bind(filters.action)}`);
  }

  if (filters.unitId) {
    clauses.push(`al.unit_id = ${bind(filters.unitId)}`);
  }

  if (filters.actorUserId) {
    clauses.push(`al.actor_user_id = ${bind(filters.actorUserId)}`);
  }

  if (filters.from) {
    clauses.push(`al.created_at >= ${bind(filters.from.toISOString())}`);
  }

  if (filters.to) {
    clauses.push(`al.created_at <= ${bind(filters.to.toISOString())}`);
  }

  if (filters.q) {
    const searchValue = `%${filters.q}%`;
    const searchBind = bind(searchValue);
    clauses.push(
      `(al.action ilike ${searchBind} or al.target_type ilike ${searchBind} or cast(al.metadata as text) ilike ${searchBind})`,
    );
  }

  return {
    whereSql: clauses.length > 0 ? `where ${clauses.join(' and ')}` : '',
    params,
  };
}

async function queryAuditLogs(input: QueryAuditLogsInput): Promise<PaginatedResponse<AuditLogItem>> {
  try {
    const { whereSql, params } = buildWhereClause(input.filters);
    const pool = getDbPool();

    const countResult = await pool.query<TotalRow>(
      `
      select count(*)::bigint as total
      from public.audit_logs al
      ${whereSql}
      `,
      params,
    );

    const sortColumn = AUDIT_SORT_COLUMN_MAP[input.sort];
    const orderDirection = input.order === 'asc' ? 'asc' : 'desc';

    const dataParams = [...params];
    dataParams.push(input.limit);
    const limitBind = `$${dataParams.length}`;
    dataParams.push((input.page - 1) * input.limit);
    const offsetBind = `$${dataParams.length}`;

    const dataResult = await pool.query<AuditLogRow>(
      `
      select
        al.id,
        al.instance_id as "instanceId",
        al.action,
        al.target_type as "targetType",
        al.target_id as "targetId",
        al.unit_id as "unitId",
        al.actor_user_id as "actorUserId",
        al.ip,
        al.user_agent as "userAgent",
        al.request_id as "requestId",
        al.metadata,
        al.created_at as "createdAt"
      from public.audit_logs al
      ${whereSql}
      order by ${sortColumn} ${orderDirection} nulls last, al.id ${orderDirection}
      limit ${limitBind}
      offset ${offsetBind}
      `,
      dataParams,
    );

    const total = countResult.rows[0] ? Number.parseInt(countResult.rows[0].total, 10) : 0;

    return {
      items: dataResult.rows.map(mapAuditLogRow),
      total: Number.isNaN(total) ? 0 : total,
      page: input.page,
      limit: input.limit,
    };
  } catch (error) {
    console.error('[AUDIT_REPO] queryAuditLogs failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to query audit logs');
  }
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    await getDbPool().query(
      `
      insert into public.audit_logs (
        instance_id,
        action,
        target_type,
        target_id,
        unit_id,
        actor_user_id,
        ip,
        user_agent,
        request_id,
        metadata
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      `,
      [
        input.instanceId,
        input.action,
        input.targetType,
        input.targetId ?? null,
        input.unitId,
        input.actorUserId,
        input.ip,
        input.userAgent,
        input.requestId,
        JSON.stringify(input.metadata),
      ],
    );
  } catch (error) {
    console.error('[AUDIT_REPO] createAuditLog failed', formatDbError(error));
    if (error instanceof AppError) {
      throw error;
    }
    throw Errors.dbError('Failed to persist audit log');
  }
}

export async function listTenantAuditLogs(
  instanceId: string,
  query: TenantLogsQuery,
): Promise<PaginatedResponse<AuditLogItem>> {
  return queryAuditLogs({
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    order: query.order,
    filters: {
      instanceId,
      action: query.action,
      unitId: query.unitId,
      actorUserId: query.actorUserId,
      from: query.from,
      to: query.to,
      q: query.q,
    },
  });
}

export async function listAdminAuditLogs(query: AdminLogsQuery): Promise<PaginatedResponse<AuditLogItem>> {
  return queryAuditLogs({
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    order: query.order,
    filters: {
      instanceId: query.instanceId,
      action: query.action,
      from: query.from,
      to: query.to,
      q: query.q,
    },
  });
}
