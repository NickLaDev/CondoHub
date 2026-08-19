import { http } from '@/services/http';
import type { CondoProfile, UpdateCondoProfileRequest } from '@/modules/condo/types.ts';

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function formatAddress(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return '';
  }

  return (
    readString(record.text)
    ?? readString(record.fullAddress)
    ?? readString(record.formatted)
    ?? Object.values(record)
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(', ')
  );
}

function normalizeCondoProfile(raw: unknown): CondoProfile {
  const record = asRecord(raw) ?? {};
  const settings = asRecord(record.settings);
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? readString(record.instanceId) ?? readString(record.instance_id) ?? 'condo-profile',
    name: readString(record.displayName) ?? readString(record.name) ?? 'Condominio',
    address: formatAddress(record.address),
    phone: readString(record.phone) ?? readString(settings?.phone) ?? '',
    createdAt,
    updatedAt: readString(record.updatedAt) ?? readString(record.updated_at) ?? createdAt,
  };
}

function toBackendUpdatePayload(data: UpdateCondoProfileRequest) {
  return {
    ...(data.name !== undefined ? { displayName: data.name } : {}),
    ...(data.address !== undefined ? { address: { text: data.address } } : {}),
    ...(data.phone !== undefined ? { settings: { phone: data.phone } } : {}),
  };
}

export async function getCondoProfile(instanceKey: string): Promise<CondoProfile> {
  const response = await http.get<CondoProfile>(`/api/v1/${instanceKey}/condo/profile`, {
    tenantKey: instanceKey,
  });
  return normalizeCondoProfile(response.data);
}

export async function updateCondoProfile(
  instanceKey: string,
  data: UpdateCondoProfileRequest,
): Promise<CondoProfile> {
  const response = await http.patch<CondoProfile>(
    `/api/v1/${instanceKey}/condo/profile`,
    toBackendUpdatePayload(data),
    {
      tenantKey: instanceKey,
    },
  );
  return normalizeCondoProfile(response.data);
}
