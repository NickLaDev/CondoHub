import { Request } from 'express';
import { z } from 'zod';
import { Errors } from '../../core/contract/errors';

const MAX_PAGE_LIMIT = 100;

const uuidSchema = z.string().uuid();

const createBlockSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
  })
  .strict();

const patchBlockSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine((value) => value.label !== undefined, {
    message: 'At least one field must be provided',
  });

const createUnitSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    blockId: z.string().uuid().nullable().optional(),
  })
  .strict();

const patchUnitSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    blockId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((value) => value.label !== undefined || value.blockId !== undefined, {
    message: 'At least one field must be provided',
  });

const idParamSchema = z.object({
  id: uuidSchema,
});

export type StructureListQuery = {
  page: number;
  limit: number;
  includeArchived: boolean;
};

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type PatchBlockInput = z.infer<typeof patchBlockSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type PatchUnitInput = z.infer<typeof patchUnitSchema>;

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

function parseBoolean(value: string | undefined, key: string, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  throw Errors.validationError({ [key]: 'Must be true or false' });
}

export function parseStructureListQuery(query: Request['query']): StructureListQuery {
  return {
    page: parsePositiveInt(query, 'page', 1),
    limit: parsePositiveInt(query, 'limit', 20, MAX_PAGE_LIMIT),
    includeArchived: parseBoolean(readQueryString(query, 'includeArchived'), 'includeArchived', false),
  };
}

export function parseIdParam(params: Request['params']): string {
  return idParamSchema.parse(params).id;
}

export function parseCreateBlockInput(body: unknown): CreateBlockInput {
  return createBlockSchema.parse(body);
}

export function parsePatchBlockInput(body: unknown): PatchBlockInput {
  return patchBlockSchema.parse(body);
}

export function parseCreateUnitInput(body: unknown): CreateUnitInput {
  return createUnitSchema.parse(body);
}

export function parsePatchUnitInput(body: unknown): PatchUnitInput {
  return patchUnitSchema.parse(body);
}
