import { http } from '@/services/http';
import { getHttpStatus } from '@/services/errors';
import { normalizePaginatedResponse } from '@/services/pagination';
import type { TurnInfo, TurnQueueDelivery, TurnSnapshot } from '@/modules/turns/types';

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeTurn(raw: unknown): TurnInfo {
  const record = asRecord(raw) ?? {};
  const actor = asRecord(record.actor) ?? asRecord(record.user);
  const startedAt =
    readString(record.startedAt)
    ?? readString(record.started_at);
  const endedAt =
    readString(record.endedAt)
    ?? readString(record.ended_at);

  return {
    id: readString(record.id) ?? `turn-${startedAt ?? Date.now()}`,
    actorName:
      readString(record.actorName)
      ?? readString(actor?.name),
    startedAt,
    endedAt,
    isOpen: !endedAt,
  };
}

function normalizeQueueDelivery(raw: unknown): TurnQueueDelivery {
  const record = asRecord(raw) ?? {};
  const unit = asRecord(record.unit);
  const block = asRecord(unit?.block);
  const unitLabel =
    readString(record.unitLabel)
    ?? (readString(block?.name) && readString(unit?.number)
      ? `${readString(block?.name)} - ${readString(unit?.number)}`
      : readString(unit?.number));

  return {
    id: readString(record.id) ?? 'queue-delivery',
    code:
      readString(record.code)
      ?? readString(record.trackingCode)
      ?? 'Sem codigo',
    recipientName:
      readString(record.recipientName)
      ?? 'Destinatario nao informado',
    unitLabel,
    status: readString(record.status) ?? 'CHEGOU',
  };
}

function normalizeTurnSnapshot(raw: unknown): TurnSnapshot {
  const payload = asRecord(raw);

  if (!payload) {
    return {
      currentTurn: null,
      history: [],
      queueDeliveries: [],
      unavailable: true,
    };
  }

  const queueDeliveries = normalizePaginatedResponse<unknown>(payload, {
    dataKeys: ['data', 'items', 'deliveries', 'queue'],
  }).data.map((item) => normalizeQueueDelivery(item));

  const currentRaw =
    payload.currentTurn
    ?? payload.openTurn
    ?? payload.activeTurn
    ?? payload.turn;
  const historyRaw = readArray<unknown>(
    payload.history ?? payload.turnHistory ?? payload.turns,
  );
  const history = historyRaw.map((item) => normalizeTurn(item));
  const normalizedCurrent = currentRaw ? normalizeTurn(currentRaw) : null;
  const derivedCurrent =
    normalizedCurrent
    ?? history.find((item) => item.isOpen)
    ?? null;

  return {
    currentTurn: derivedCurrent,
    history,
    queueDeliveries,
  };
}

function isSnapshotUnavailable(error: unknown) {
  const status = getHttpStatus(error);
  return status === 403 || status === 404 || status === 405 || status === 501;
}

export async function getTurnsSnapshot(instanceKey: string): Promise<TurnSnapshot> {
  try {
    const response = await http.get(`/api/v1/${instanceKey}/deliveries/queue`, {
      tenantKey: instanceKey,
    });
    return normalizeTurnSnapshot(response.data);
  } catch (error) {
    if (isSnapshotUnavailable(error)) {
      return {
        currentTurn: null,
        history: [],
        queueDeliveries: [],
        unavailable: true,
      };
    }

    throw error;
  }
}

export async function startTurn(instanceKey: string): Promise<TurnSnapshot> {
  const response = await http.post(`/api/v1/${instanceKey}/turns/start`, null, {
    tenantKey: instanceKey,
  });
  return {
    currentTurn: normalizeTurn(response.data),
    history: [],
    queueDeliveries: [],
  };
}

export async function endTurn(instanceKey: string): Promise<TurnSnapshot> {
  const response = await http.post(`/api/v1/${instanceKey}/turns/end`, null, {
    tenantKey: instanceKey,
  });
  return {
    currentTurn: normalizeTurn(response.data),
    history: [],
    queueDeliveries: [],
  };
}
