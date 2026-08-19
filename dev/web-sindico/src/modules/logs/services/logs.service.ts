import { http } from '@/services/http';
import { normalizePaginatedResponse } from '@/services/pagination';
import type {
  InstanceLogEntry,
  LogsQueryParams,
  LogsResponse,
} from '@/modules/logs/types';

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function buildUnitLabel(record: Record<string, unknown> | null) {
  if (!record) {
    return null;
  }

  const explicit = readString(record.unitLabel);
  if (explicit) {
    return explicit;
  }

  const unit = asRecord(record.unit);
  const block = asRecord(unit?.block);
  const number = readString(unit?.number);
  const blockName = readString(block?.name);

  if (blockName && number) {
    return `${blockName} - ${number}`;
  }

  return number;
}

function normalizeLog(raw: unknown, index: number): InstanceLogEntry {
  const record = asRecord(raw) ?? {};
  const actor =
    asRecord(record.actor)
    ?? asRecord(record.user);

  return {
    id: readString(record.id) ?? `log-${index}`,
    createdAt:
      readString(record.createdAt)
      ?? readString(record.timestamp)
      ?? readString(record.created_at),
    actorName:
      readString(record.actorName)
      ?? readString(actor?.name)
      ?? readString(record.actor),
    actorId:
      readString(record.actorId)
      ?? readString(actor?.id),
    action: readString(record.action) ?? 'ACAO_NAO_INFORMADA',
    entity:
      readString(record.entity)
      ?? readString(record.targetType)
      ?? readString(record.entityType),
    requestId:
      readString(record.requestId)
      ?? readString(record.request_id),
    unitId:
      readString(record.unitId)
      ?? readString(record.unit_id)
      ?? readString(asRecord(record.unit)?.id),
    unitLabel: buildUnitLabel(record),
    context:
      readString(record.context)
      ?? readString(record.summary)
      ?? readString(record.message),
    detailsJson: record.detailsJson ?? record.details_json ?? record.details ?? null,
    ip: readString(record.ip) ?? readString(record.ipAddress),
    userAgent:
      readString(record.userAgent)
      ?? readString(record.user_agent),
  };
}

export async function getInstanceLogs(
  instanceKey: string,
  params?: LogsQueryParams,
): Promise<LogsResponse> {
  const response = await http.get(`/api/v1/${instanceKey}/logs`, {
    params,
    tenantKey: instanceKey,
  });

  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    dataKeys: ['data', 'items', 'logs'],
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map((item, index) => normalizeLog(item, index)),
  };
}
