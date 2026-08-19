export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function toPositiveNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function createEmptyPaginatedResponse<T>(
  pagination: Partial<PaginationMeta> = {},
): PaginatedResponse<T> {
  return {
    data: [],
    pagination: {
      ...DEFAULT_PAGINATION,
      ...pagination,
    },
  };
}

export function normalizePagination(
  value: unknown,
  fallbackLimit = DEFAULT_PAGINATION.limit,
  fallbackTotal = 0,
): PaginationMeta {
  const pagination = asRecord(value);

  if (!pagination) {
    const total = Math.max(fallbackTotal, 0);
    const limit = Math.max(fallbackLimit, 1);

    return {
      page: 1,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  const page = toPositiveNumber(pagination.page, 1);
  const limit = toPositiveNumber(
    pagination.limit ?? pagination.pageSize,
    Math.max(fallbackLimit, 1),
  );
  const total = toPositiveNumber(
    pagination.total ?? pagination.totalItems ?? pagination.count,
    Math.max(fallbackTotal, 0),
  );
  const totalPages = toPositiveNumber(
    pagination.totalPages ?? pagination.pages,
    Math.max(1, Math.ceil(total / limit)),
  );

  return {
    page,
    limit,
    total,
    totalPages: Math.max(totalPages, 1),
  };
}

export function normalizePaginatedResponse<T>(
  payload: unknown,
  options: {
    dataKeys?: string[];
    defaultLimit?: number;
  } = {},
): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      pagination: normalizePagination(undefined, options.defaultLimit, payload.length),
    };
  }

  const record = asRecord(payload);
  if (!record) {
    return createEmptyPaginatedResponse<T>({
      limit: options.defaultLimit ?? DEFAULT_PAGINATION.limit,
    });
  }

  const dataKeys = options.dataKeys ?? ['data', 'items', 'results'];
  const data = dataKeys.reduce<T[]>((resolved, key) => {
    if (resolved.length > 0) {
      return resolved;
    }

    const candidate = record[key];
    return Array.isArray(candidate) ? (candidate as T[]) : resolved;
  }, []);

  return {
    data,
    pagination: normalizePagination(
      record.pagination ?? record,
      options.defaultLimit,
      data.length,
    ),
  };
}
