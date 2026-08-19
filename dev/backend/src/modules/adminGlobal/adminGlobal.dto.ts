import { Request } from 'express';
import { z } from 'zod';
import { Errors } from '../../core/contract/errors';
import { INSTANCE_STATUS, InstanceStatus } from '../instances/instances.types';

const MAX_PAGE_LIMIT = 100;

export const ADMIN_INSTANCE_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'name',
  'instance_key',
  'status',
] as const;
export type AdminInstanceSortField = (typeof ADMIN_INSTANCE_SORT_FIELDS)[number];

export const ADMIN_PLAN_SORT_FIELDS = [
  'created_at',
  'name',
  'price_cents',
  'currency',
  'archived_at',
] as const;
export type AdminPlanSortField = (typeof ADMIN_PLAN_SORT_FIELDS)[number];

export type SortOrder = 'asc' | 'desc';

export type AdminInstancesListQuery = {
  page: number;
  limit: number;
  sort: AdminInstanceSortField;
  order: SortOrder;
  status?: InstanceStatus;
  planId?: string;
  q?: string;
};

export type AdminPlansListQuery = {
  page: number;
  limit: number;
  sort: AdminPlanSortField;
  order: SortOrder;
  archived?: boolean;
  q?: string;
};

const uuidSchema = z.string().uuid();
const instanceIdParamSchema = z.object({
  id: uuidSchema,
});
const planIdParamSchema = z.object({
  id: uuidSchema,
});

const featuresSchema = z.record(z.unknown());
const limitsSchema = z.record(z.unknown());

const trimmedNameSchema = z.string().trim().min(1).max(160);
const instanceKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const currencySchema = z.string().trim().toUpperCase().length(3);

const createInstanceSchema = z
  .object({
    name: trimmedNameSchema,
    instanceKey: instanceKeySchema.optional(),
    planId: z.union([uuidSchema, z.null()]).optional(),
  })
  .strict();

const updateInstanceSchema = z
  .object({
    name: trimmedNameSchema.optional(),
    planId: z.union([uuidSchema, z.null()]).optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.planId !== undefined, {
    message: 'At least one field must be provided',
  });

const createPlanSchema = z
  .object({
    name: trimmedNameSchema,
    features: featuresSchema.optional(),
    limits: limitsSchema.optional(),
    priceCents: z.number().int().min(0).nullable().optional(),
    currency: currencySchema.nullable().optional(),
  })
  .strict();

const updatePlanSchema = z
  .object({
    name: trimmedNameSchema.optional(),
    features: featuresSchema.optional(),
    limits: limitsSchema.optional(),
    priceCents: z.number().int().min(0).nullable().optional(),
    currency: currencySchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.features !== undefined ||
      value.limits !== undefined ||
      value.priceCents !== undefined ||
      value.currency !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

const resetSindicoSupportSchema = z
  .object({
    instanceId: uuidSchema,
    userId: uuidSchema.optional(),
    email: z.string().trim().email().optional(),
    newPassword: z.string().min(1).max(256),
  })
  .strict()
  .superRefine((value, ctx) => {
    const identifierCount = Number(Boolean(value.userId)) + Number(Boolean(value.email));
    if (identifierCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one identifier: userId or email',
        path: ['userId'],
      });
    }
  });

export type CreateAdminInstanceInput = z.infer<typeof createInstanceSchema>;
export type UpdateAdminInstanceInput = z.infer<typeof updateInstanceSchema>;
export type CreateAdminPlanInput = z.infer<typeof createPlanSchema>;
export type UpdateAdminPlanInput = z.infer<typeof updatePlanSchema>;
export type ResetSindicoSupportInput = z.infer<typeof resetSindicoSupportSchema>;

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

function parseOrder(query: Request['query']): SortOrder {
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

function parseOptionalUuid(query: Request['query'], key: string): string | undefined {
  const rawValue = parseOptionalString(query, key);
  if (!rawValue) {
    return undefined;
  }

  if (!uuidSchema.safeParse(rawValue).success) {
    throw Errors.validationError({ [key]: 'Must be a valid UUID' });
  }

  return rawValue;
}

function parseOptionalInstanceStatus(query: Request['query']): InstanceStatus | undefined {
  const rawValue = parseOptionalString(query, 'status');
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.toUpperCase();
  if (normalized !== INSTANCE_STATUS.ACTIVE && normalized !== INSTANCE_STATUS.SUSPENDED) {
    throw Errors.validationError({
      status: `Allowed: ${INSTANCE_STATUS.ACTIVE}, ${INSTANCE_STATUS.SUSPENDED}`,
    });
  }

  return normalized;
}

function parseOptionalBoolean(query: Request['query'], key: string): boolean | undefined {
  const rawValue = readQueryString(query, key);
  if (rawValue === undefined || rawValue.length === 0) {
    return undefined;
  }

  const normalized = rawValue.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  throw Errors.validationError({ [key]: 'Must be true or false' });
}

function parseSort<T extends readonly string[]>(
  query: Request['query'],
  allowlist: T,
  defaultValue: T[number],
): T[number] {
  const rawValue = readQueryString(query, 'sort');
  if (!rawValue) {
    return defaultValue;
  }

  const normalized = rawValue.toLowerCase();
  if (!allowlist.includes(normalized)) {
    throw Errors.validationError({
      sort: `Invalid sort field. Allowed: ${allowlist.join(', ')}`,
    });
  }

  return normalized as T[number];
}

export function parseAdminInstancesListQuery(query: Request['query']): AdminInstancesListQuery {
  return {
    page: parsePositiveInt(query, 'page', 1),
    limit: parsePositiveInt(query, 'limit', 20, MAX_PAGE_LIMIT),
    sort: parseSort(query, ADMIN_INSTANCE_SORT_FIELDS, 'created_at'),
    order: parseOrder(query),
    status: parseOptionalInstanceStatus(query),
    planId: parseOptionalUuid(query, 'planId'),
    q: parseOptionalString(query, 'q'),
  };
}

export function parseAdminPlansListQuery(query: Request['query']): AdminPlansListQuery {
  return {
    page: parsePositiveInt(query, 'page', 1),
    limit: parsePositiveInt(query, 'limit', 20, MAX_PAGE_LIMIT),
    sort: parseSort(query, ADMIN_PLAN_SORT_FIELDS, 'created_at'),
    order: parseOrder(query),
    archived: parseOptionalBoolean(query, 'archived'),
    q: parseOptionalString(query, 'q'),
  };
}

export function parseAdminInstanceIdParam(params: Request['params']): string {
  return instanceIdParamSchema.parse(params).id;
}

export function parseAdminPlanIdParam(params: Request['params']): string {
  return planIdParamSchema.parse(params).id;
}

export function parseCreateAdminInstanceInput(body: unknown): CreateAdminInstanceInput {
  return createInstanceSchema.parse(body);
}

export function parseUpdateAdminInstanceInput(body: unknown): UpdateAdminInstanceInput {
  return updateInstanceSchema.parse(body);
}

export function parseCreateAdminPlanInput(body: unknown): CreateAdminPlanInput {
  return createPlanSchema.parse(body);
}

export function parseUpdateAdminPlanInput(body: unknown): UpdateAdminPlanInput {
  return updatePlanSchema.parse(body);
}

export function parseResetSindicoSupportInput(body: unknown): ResetSindicoSupportInput {
  return resetSindicoSupportSchema.parse(body);
}
