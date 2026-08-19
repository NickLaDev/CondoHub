import { Request } from 'express';
import { z } from 'zod';
import { Errors } from '../../core/contract/errors';
import { ROLES } from '../../core/contract/roles';

const MAX_PAGE_LIMIT = 100;
const uuidSchema = z.string().uuid();

const userStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

const createResidentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    unitId: uuidSchema,
    password: z.string().min(6).max(256),
  })
  .strict();

const patchResidentSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    unitId: uuidSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.phone !== undefined ||
      value.unitId !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

const staffRoleSchema = z.enum([ROLES.FUNC_ENTREGAS, ROLES.FUNC_MANUTENCAO]);

const createStaffSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    role: staffRoleSchema,
    password: z.string().min(6).max(256),
  })
  .strict();

const patchStaffSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    role: staffRoleSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.phone !== undefined ||
      value.role !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

const idParamSchema = z.object({
  id: uuidSchema,
});

export type TenantUsersListQuery = {
  page: number;
  limit: number;
  status?: z.infer<typeof userStatusSchema>;
  q?: string;
};

export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type PatchResidentInput = z.infer<typeof patchResidentSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type PatchStaffInput = z.infer<typeof patchStaffSchema>;
export type StaffRole = z.infer<typeof staffRoleSchema>;

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

function parseOptionalStatus(query: Request['query']): z.infer<typeof userStatusSchema> | undefined {
  const rawValue = readQueryString(query, 'status');
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.toUpperCase();
  const parsed = userStatusSchema.safeParse(normalized);
  if (!parsed.success) {
    throw Errors.validationError({ status: 'Allowed: ACTIVE, DISABLED' });
  }

  return parsed.data;
}

function parseOptionalQueryText(query: Request['query']): string | undefined {
  const rawValue = readQueryString(query, 'q');
  if (!rawValue) {
    return undefined;
  }
  return rawValue;
}

export function parseTenantUsersListQuery(query: Request['query']): TenantUsersListQuery {
  return {
    page: parsePositiveInt(query, 'page', 1),
    limit: parsePositiveInt(query, 'limit', 20, MAX_PAGE_LIMIT),
    status: parseOptionalStatus(query),
    q: parseOptionalQueryText(query),
  };
}

export function parseIdParam(params: Request['params']): string {
  return idParamSchema.parse(params).id;
}

export function parseCreateResidentInput(body: unknown): CreateResidentInput {
  return createResidentSchema.parse(body);
}

export function parsePatchResidentInput(body: unknown): PatchResidentInput {
  return patchResidentSchema.parse(body);
}

export function parseCreateStaffInput(body: unknown): CreateStaffInput {
  return createStaffSchema.parse(body);
}

export function parsePatchStaffInput(body: unknown): PatchStaffInput {
  return patchStaffSchema.parse(body);
}
