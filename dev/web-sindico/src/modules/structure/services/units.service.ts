import { http } from '@/services/http';
import type { Unit, UnitsResponse, CreateUnitRequest, UpdateUnitRequest } from '@/modules/structure/types';
import { normalizeBlock } from '@/modules/structure/services/blocks.service';
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

function normalizeUnit(raw: unknown): Unit {
  const record = asRecord(raw) ?? {};
  const blockRecord = asRecord(record.block);
  const blockId = readString(record.blockId) ?? readString(record.block_id) ?? readString(blockRecord?.id) ?? '';
  const id = readString(record.id) ?? `unit-${readString(record.label) ?? 'unknown'}`;
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();
  const archivedAt = readString(record.archivedAt) ?? readString(record.archived_at);
  const status = readString(record.status) === 'archived' || archivedAt ? 'archived' : 'active';

  return {
    id,
    blockId,
    block: blockRecord
      ? normalizeBlock(blockRecord)
      : {
          id: blockId,
          name: readString(record.blockName) ?? 'Bloco nao informado',
          status: 'active',
          createdAt,
          updatedAt: createdAt,
        },
    number: readString(record.number) ?? readString(record.label) ?? id,
    status,
    createdAt,
    updatedAt: readString(record.updatedAt) ?? readString(record.updated_at) ?? createdAt,
  };
}

export async function getUnits(
  instanceKey: string,
  params?: { page?: number; limit?: number; blockId?: string; search?: string },
): Promise<UnitsResponse> {
  const response = await http.get<UnitsResponse>(`/api/v1/${instanceKey}/structure/units`, {
    params,
    tenantKey: instanceKey,
  });
  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map(normalizeUnit),
  };
}

export async function createUnit(
  instanceKey: string,
  data: CreateUnitRequest,
): Promise<Unit> {
  const response = await http.post<Unit>(`/api/v1/${instanceKey}/structure/units`, data, {
    tenantKey: instanceKey,
  });
  return normalizeUnit(response.data);
}

export async function updateUnit(
  instanceKey: string,
  id: string,
  data: UpdateUnitRequest,
): Promise<Unit> {
  const response = await http.patch<Unit>(`/api/v1/${instanceKey}/structure/units/${id}`, data, {
    tenantKey: instanceKey,
  });
  return normalizeUnit(response.data);
}

export async function archiveUnit(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/structure/units/${id}/archive`, null, {
    tenantKey: instanceKey,
  });
}
