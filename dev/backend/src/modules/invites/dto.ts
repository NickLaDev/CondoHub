import { Request } from 'express';
import { z } from 'zod';
import { Errors } from '../../core/contract/errors';

const MAX_PAGE_LIMIT = 100;
const uuidSchema = z.string().uuid();

const createInviteSchema = z
  .object({
    unitId: uuidSchema,
    kind: z.literal('RESIDENT_JOIN').optional(),
    expiresAt: z.string().datetime().optional(),
    expiresInHours: z.number().int().min(1).max(720).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.expiresAt !== undefined && value.expiresInHours !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either expiresAt or expiresInHours, not both',
        path: ['expiresAt'],
      });
    }
  });

const resolveInviteCodeSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
  })
  .strict();

const idParamSchema = z.object({
  id: uuidSchema,
});

const instanceKeyParamSchema = z.object({
  instanceKey: z.string().trim().min(1, 'instanceKey is required'),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type ResolveInviteCodeInput = z.infer<typeof resolveInviteCodeSchema>;

export type TenantInvitesListQuery = {
  page: number;
  limit: number;
  unitId?: string;
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

function parseOptionalUnitId(query: Request['query']): string | undefined {
  const rawValue = readQueryString(query, 'unitId');
  if (!rawValue) {
    return undefined;
  }

  if (!uuidSchema.safeParse(rawValue).success) {
    throw Errors.validationError({ unitId: 'Must be a valid UUID' });
  }

  return rawValue;
}

export function parseCreateInviteInput(body: unknown): CreateInviteInput {
  return createInviteSchema.parse(body);
}

export function parseResolveInviteCodeInput(body: unknown): ResolveInviteCodeInput {
  return resolveInviteCodeSchema.parse(body);
}

export function parseIdParam(params: Request['params']): string {
  return idParamSchema.parse(params).id;
}

export function parseTenantInvitesListQuery(query: Request['query']): TenantInvitesListQuery {
  return {
    page: parsePositiveInt(query, 'page', 1),
    limit: parsePositiveInt(query, 'limit', 20, MAX_PAGE_LIMIT),
    unitId: parseOptionalUnitId(query),
  };
}

export function parseInstanceKeyParam(params: Request['params']): string {
  return instanceKeyParamSchema.parse(params).instanceKey;
}
