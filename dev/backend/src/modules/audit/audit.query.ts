import { Request } from 'express';
import { Errors } from '../../core/contract/errors';

const MAX_LOGS_QUERY_LENGTH = 120;

export const AUDIT_SORT_FIELDS = ['created_at', 'action', 'unit_id', 'actor_user_id'] as const;
export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];
export type AuditOrder = 'asc' | 'desc';

export type CommonLogsQuery = {
  page: number;
  limit: number;
  sort: AuditSortField;
  order: AuditOrder;
  action?: string;
  from?: Date;
  to?: Date;
  q?: string;
};

export type TenantLogsQuery = CommonLogsQuery & {
  unitId?: string;
  actorUserId?: string;
};

export type AdminLogsQuery = CommonLogsQuery & {
  instanceId?: string;
};

function readQueryString(query: Request['query'], key: string): string | undefined {
  const rawValue = query[key];

  if (rawValue === undefined) {
    return undefined;
  }

  if (Array.isArray(rawValue)) {
    throw Errors.validationError({ [key]: 'Must be a single value' });
  }

  if (typeof rawValue !== 'string') {
    throw Errors.validationError({ [key]: 'Invalid query param type' });
  }

  return rawValue.trim();
}

function parsePositiveInt(
  query: Request['query'],
  key: 'page' | 'limit',
  defaultValue: number,
  maxValue?: number,
): number {
  const rawValue = readQueryString(query, key);

  if (rawValue === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw Errors.validationError({ [key]: 'Must be a positive integer' });
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw Errors.validationError({ [key]: 'Must be a positive integer' });
  }

  if (maxValue !== undefined && parsed > maxValue) {
    return maxValue;
  }

  return parsed;
}

function parseSort(query: Request['query']): AuditSortField {
  const rawValue = readQueryString(query, 'sort');
  if (!rawValue) {
    return 'created_at';
  }

  const normalized = rawValue.toLowerCase();
  if (!(AUDIT_SORT_FIELDS as readonly string[]).includes(normalized)) {
    throw Errors.validationError({
      sort: `Invalid sort field. Allowed: ${AUDIT_SORT_FIELDS.join(', ')}`,
    });
  }

  return normalized as AuditSortField;
}

function parseOrder(query: Request['query']): AuditOrder {
  const rawValue = readQueryString(query, 'order');
  if (!rawValue) {
    return 'desc';
  }

  const normalized = rawValue.toLowerCase();
  if (normalized !== 'asc' && normalized !== 'desc') {
    throw Errors.validationError({ order: 'Must be asc or desc' });
  }

  return normalized;
}

function parseOptionalString(query: Request['query'], key: string): string | undefined {
  const rawValue = readQueryString(query, key);
  if (rawValue === undefined || rawValue.length === 0) {
    return undefined;
  }
  return rawValue;
}

function parseOptionalSearchQuery(query: Request['query']): string | undefined {
  const q = parseOptionalString(query, 'q');
  if (!q) {
    return undefined;
  }

  if (q.length > MAX_LOGS_QUERY_LENGTH) {
    throw Errors.validationError({
      q: `Must be at most ${MAX_LOGS_QUERY_LENGTH} characters`,
    });
  }

  return q;
}

function parseOptionalDate(query: Request['query'], key: 'from' | 'to'): Date | undefined {
  const rawValue = readQueryString(query, key);
  if (!rawValue) {
    return undefined;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    throw Errors.validationError({ [key]: 'Must be a valid ISO date' });
  }

  return parsed;
}

function parseCommonLogsQuery(query: Request['query']): CommonLogsQuery {
  const page = parsePositiveInt(query, 'page', 1);
  const limit = parsePositiveInt(query, 'limit', 20, 100);
  const sort = parseSort(query);
  const order = parseOrder(query);
  const action = parseOptionalString(query, 'action');
  const from = parseOptionalDate(query, 'from');
  const to = parseOptionalDate(query, 'to');
  const q = parseOptionalSearchQuery(query);

  if (from && to && from.getTime() > to.getTime()) {
    throw Errors.validationError({ range: 'from must be less than or equal to to' });
  }

  return {
    page,
    limit,
    sort,
    order,
    action,
    from,
    to,
    q,
  };
}

export function parseTenantLogsQuery(query: Request['query']): TenantLogsQuery {
  const common = parseCommonLogsQuery(query);

  return {
    ...common,
    unitId: parseOptionalString(query, 'unitId'),
    actorUserId: parseOptionalString(query, 'actorUserId'),
  };
}

export function parseAdminLogsQuery(query: Request['query']): AdminLogsQuery {
  const common = parseCommonLogsQuery(query);

  return {
    ...common,
    instanceId: parseOptionalString(query, 'instanceId'),
  };
}
