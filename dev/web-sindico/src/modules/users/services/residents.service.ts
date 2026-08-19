import { http } from '@/services/http';
import type { Resident, ResidentsResponse, CreateResidentRequest, UpdateResidentRequest } from '@/modules/users/types';
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

function normalizeStatus(value: unknown): Resident['status'] {
  const normalized = readString(value)?.toLowerCase();
  return normalized === 'inactive' || normalized === 'disabled' ? 'inactive' : 'active';
}

function normalizeResident(raw: unknown): Resident {
  const record = asRecord(raw) ?? {};
  const unit = asRecord(record.unit);
  const block = asRecord(unit?.block);
  const unitId = readString(record.unitId) ?? readString(record.unit_id) ?? readString(unit?.id) ?? '';
  const unitNumber = readString(unit?.number) ?? readString(unit?.label) ?? readString(record.unitLabel) ?? unitId;
  const blockId = readString(block?.id) ?? readString(record.blockId) ?? readString(record.block_id) ?? '';
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `resident-${readString(record.email) ?? createdAt}`,
    name: readString(record.name) ?? 'Morador',
    email: readString(record.email) ?? '',
    phone: readString(record.phone) ?? undefined,
    unitId,
    unit: {
      id: unitId,
      number: unitNumber || 'Unidade nao informada',
      block: {
        id: blockId,
        name: readString(block?.name) ?? readString(record.blockName) ?? 'Bloco nao informado',
      },
    },
    status: normalizeStatus(record.status),
    createdAt,
    updatedAt: readString(record.updatedAt) ?? readString(record.updated_at) ?? createdAt,
  };
}

export async function getResidents(
  instanceKey: string,
  params?: { page?: number; limit?: number; blockId?: string; unitId?: string; status?: string; search?: string },
): Promise<ResidentsResponse> {
  const response = await http.get<ResidentsResponse>(`/api/v1/${instanceKey}/users/residents`, {
    params,
    tenantKey: instanceKey,
  });
  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map(normalizeResident),
  };
}

export async function createResident(
  instanceKey: string,
  data: CreateResidentRequest,
): Promise<Resident> {
  const response = await http.post<Resident>(`/api/v1/${instanceKey}/users/residents`, data, {
    tenantKey: instanceKey,
  });
  return normalizeResident(response.data);
}

export async function updateResident(
  instanceKey: string,
  id: string,
  data: UpdateResidentRequest,
): Promise<Resident> {
  const response = await http.patch<Resident>(`/api/v1/${instanceKey}/users/residents/${id}`, data, {
    tenantKey: instanceKey,
  });
  return normalizeResident(response.data);
}

export async function disableResident(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/users/residents/${id}/disable`, null, {
    tenantKey: instanceKey,
  });
}
