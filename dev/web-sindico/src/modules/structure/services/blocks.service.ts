import { http } from '@/services/http';
import type { Block, BlocksResponse, CreateBlockRequest, UpdateBlockRequest } from '@/modules/structure/types.ts';
import { normalizePaginatedResponse } from '@/services/pagination';

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export function normalizeBlock(raw: unknown): Block {
  const record = asRecord(raw) ?? {};
  const id = readString(record.id) ?? `block-${readString(record.label) ?? 'unknown'}`;
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();
  const archivedAt = readString(record.archivedAt) ?? readString(record.archived_at);
  const status = readString(record.status) === 'archived' || archivedAt ? 'archived' : 'active';

  return {
    id,
    name: readString(record.name) ?? readString(record.label) ?? id,
    status,
    createdAt,
    updatedAt: readString(record.updatedAt) ?? readString(record.updated_at) ?? createdAt,
  };
}

export async function getBlocks(
  instanceKey: string,
  params?: { page?: number; limit?: number; search?: string },
): Promise<BlocksResponse> {
  const response = await http.get<BlocksResponse>(`/api/v1/${instanceKey}/structure/blocks`, {
    params,
    tenantKey: instanceKey,
  });
  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map(normalizeBlock),
  };
}

export async function createBlock(
  instanceKey: string,
  data: CreateBlockRequest,
): Promise<Block> {
  const response = await http.post<Block>(`/api/v1/${instanceKey}/structure/blocks`, data, {
    tenantKey: instanceKey,
  });
  return normalizeBlock(response.data);
}

export async function updateBlock(
  instanceKey: string,
  id: string,
  data: UpdateBlockRequest,
): Promise<Block> {
  const response = await http.patch<Block>(`/api/v1/${instanceKey}/structure/blocks/${id}`, data, {
    tenantKey: instanceKey,
  });
  return normalizeBlock(response.data);
}

export async function archiveBlock(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/structure/blocks/${id}/archive`, null, {
    tenantKey: instanceKey,
  });
}
