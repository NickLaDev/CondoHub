import { http } from '@/services/http';
import type {
  ActiveInviteCode,
  CreateInviteRequest,
  Invite,
  InviteCode,
  InvitesResponse,
  ResolveInviteCodeResponse,
} from '@/modules/invites/types';
import { normalizePaginatedResponse } from '@/services/pagination';
import { getHttpStatus } from '@/services/errors';

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function normalizeType(value: unknown): Invite['type'] {
  const normalized = readString(value);

  if (
    normalized === 'MORADOR'
    || normalized === 'SINDICO_ADMIN'
    || normalized === 'FUNC_ENTREGAS'
    || normalized === 'FUNC_MANUTENCAO'
  ) {
    return normalized;
  }

  return 'MORADOR';
}

function normalizeInvite(raw: unknown): Invite {
  const record = asRecord(raw) ?? {};
  const unit = asRecord(record.unit);
  const block = asRecord(unit?.block);
  const unitId = readString(record.unitId) ?? readString(record.unit_id) ?? readString(unit?.id);
  const revokedAt = readString(record.revokedAt) ?? readString(record.revoked_at);
  const usedAt = readString(record.usedAt) ?? readString(record.used_at);
  const expiresAt = readString(record.expiresAt) ?? readString(record.expires_at) ?? new Date().toISOString();
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();
  const status = revokedAt
    ? 'REVOKED'
    : usedAt
      ? 'USED'
      : new Date(expiresAt).getTime() < Date.now()
        ? 'EXPIRED'
        : 'PENDING';

  return {
    id: readString(record.id) ?? `invite-${createdAt}`,
    type: normalizeType(record.type ?? record.kind),
    email: readString(record.email) ?? 'Convite sem email',
    unitId: unitId ?? undefined,
    unit: unitId
      ? {
          id: unitId,
          number: readString(unit?.number) ?? readString(unit?.label) ?? unitId,
          block: {
            id: readString(block?.id) ?? '',
            name: readString(block?.name) ?? 'Bloco nao informado',
          },
        }
      : undefined,
    status,
    expiresAt,
    usedAt: usedAt ?? undefined,
    revokedAt: revokedAt ?? undefined,
    createdAt,
    updatedAt: readString(record.updatedAt) ?? readString(record.updated_at) ?? revokedAt ?? usedAt ?? createdAt,
  };
}

export async function getInvites(
  instanceKey: string,
  params?: { page?: number; limit?: number; type?: string; status?: string; search?: string },
): Promise<InvitesResponse> {
  const response = await http.get<InvitesResponse>(`/api/v1/${instanceKey}/invites`, {
    params,
    tenantKey: instanceKey,
  });
  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map(normalizeInvite),
  };
}

export async function createInvite(
  instanceKey: string,
  data: CreateInviteRequest,
): Promise<Invite> {
  const response = await http.post<Invite>(`/api/v1/${instanceKey}/invites`, data, {
    tenantKey: instanceKey,
  });
  return normalizeInvite(response.data);
}

export async function revokeInvite(instanceKey: string, id: string): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/invites/${id}/revoke`, null, {
    tenantKey: instanceKey,
  });
}

export async function createInviteCode(instanceKey: string): Promise<InviteCode> {
  const response = await http.post<InviteCode>(`/api/v1/${instanceKey}/invites/code`, null, {
    tenantKey: instanceKey,
  });
  return response.data;
}

export async function getActiveInviteCode(instanceKey: string): Promise<ActiveInviteCode | null> {
  try {
    const response = await http.get<ActiveInviteCode>(`/api/v1/${instanceKey}/invites/code/active`, {
      tenantKey: instanceKey,
    });
    return response.data;
  } catch (error) {
    if (getHttpStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

export async function cancelActiveInviteCode(instanceKey: string): Promise<void> {
  await http.delete(`/api/v1/${instanceKey}/invites/code/active`, {
    tenantKey: instanceKey,
  });
}

export async function resolveInviteCode(
  instanceKey: string,
  code: string,
): Promise<ResolveInviteCodeResponse> {
  const response = await http.post<ResolveInviteCodeResponse>(
    `/api/v1/${instanceKey}/invites/code/resolve`,
    { code },
    { tenantKey: instanceKey },
  );
  return response.data;
}
