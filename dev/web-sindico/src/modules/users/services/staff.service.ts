import { http } from '@/services/http';
import type { Staff, StaffResponse, CreateStaffRequest, UpdateStaffRequest } from '@/modules/users/types';
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

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value: unknown): Staff['status'] {
  const normalized = readString(value)?.toLowerCase();
  return normalized === 'inactive' || normalized === 'disabled' ? 'inactive' : 'active';
}

function normalizeRole(raw: unknown): Staff['role'] {
  const directRole = readString(raw);

  if (directRole === 'FUNC_ENTREGAS' || directRole === 'FUNC_MANUTENCAO') {
    return directRole;
  }

  return 'FUNC_MANUTENCAO';
}

function normalizeStaff(raw: unknown): Staff {
  const record = asRecord(raw) ?? {};
  const roles = readArray(record.roles);
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `staff-${readString(record.email) ?? createdAt}`,
    name: readString(record.name) ?? 'Funcionario',
    email: readString(record.email) ?? '',
    phone: readString(record.phone) ?? undefined,
    role: normalizeRole(record.role ?? roles.find((role) => typeof role === 'string')),
    status: normalizeStatus(record.status),
    createdAt,
    updatedAt: readString(record.updatedAt) ?? readString(record.updated_at) ?? createdAt,
  };
}

export async function getStaff(
  instanceKey: string,
  params?: { page?: number; limit?: number; role?: string; status?: string; search?: string },
): Promise<StaffResponse> {
  const response = await http.get<StaffResponse>(`/api/v1/${instanceKey}/users/staff`, {
    params,
    tenantKey: instanceKey,
  });
  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map(normalizeStaff),
  };
}

export async function createStaff(
  instanceKey: string,
  data: CreateStaffRequest,
): Promise<Staff> {
  const response = await http.post<Staff>(`/api/v1/${instanceKey}/users/staff`, data, {
    tenantKey: instanceKey,
  });
  return normalizeStaff(response.data);
}

export async function updateStaff(
  instanceKey: string,
  id: string,
  data: UpdateStaffRequest,
): Promise<Staff> {
  const response = await http.patch<Staff>(`/api/v1/${instanceKey}/users/staff/${id}`, data, {
    tenantKey: instanceKey,
  });
  return normalizeStaff(response.data);
}

export async function disableStaff(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/users/staff/${id}/disable`, null, {
    tenantKey: instanceKey,
  });
}
