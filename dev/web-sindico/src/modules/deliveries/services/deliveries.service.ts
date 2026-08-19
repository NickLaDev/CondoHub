import { http } from '@/services/http';
import { getHttpStatus } from '@/services/errors';
import {
  createEmptyPaginatedResponse,
  normalizePaginatedResponse,
} from '@/services/pagination';
import type {
  AssignDeliveryRequest,
  CompleteDeliveryRequest,
  CreateDeliveryRequest,
  DeliveriesResponse,
  DeliveryDetailResponse,
  DeliveryEvent,
  DeliveryListParams,
  DeliveryQueueResponse,
  DeliverySummary,
  FailDeliveryRequest,
} from '@/modules/deliveries/types';

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

function readAttachmentIds(record: Record<string, unknown> | null) {
  if (!record) {
    return [];
  }

  const directIds = readArray<string>(record.attachmentIds).filter(Boolean);
  if (directIds.length > 0) {
    return directIds;
  }

  const singleId =
    readString(record.evidenceAttachmentId)
    ?? readString(record.attachmentIdEvidence)
    ?? readString(record.attachmentId);
  if (singleId) {
    return [singleId];
  }

  const attachments = readArray<Record<string, unknown>>(record.attachments);
  return attachments
    .map((attachment) => readString(attachment.id))
    .filter((item): item is string => Boolean(item));
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

function normalizeDelivery(raw: unknown): DeliverySummary {
  const record = asRecord(raw) ?? {};
  const courier =
    asRecord(record.courier)
    ?? asRecord(record.assignedTo)
    ?? asRecord(record.deliveredBy);
  const createdAt =
    readString(record.createdAt)
    ?? readString(record.created_at)
    ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `delivery-${createdAt}`,
    code:
      readString(record.code)
      ?? readString(record.trackingCode)
      ?? readString(record.reference)
      ?? readString(record.id)
      ?? 'Sem codigo',
    unitId:
      readString(record.unitId)
      ?? readString(record.unit_id)
      ?? readString(asRecord(record.unit)?.id),
    unitLabel: buildUnitLabel(record),
    recipientName:
      readString(record.recipientName)
      ?? readString(record.recipient_name)
      ?? readString(record.deliveredToName)
      ?? 'Destinatario nao informado',
    courierUserId:
      readString(record.courierUserId)
      ?? readString(record.courier_user_id)
      ?? readString(courier?.id),
    courierName:
      readString(record.courierName)
      ?? readString(record.courier_name)
      ?? readString(courier?.name),
    deliveredToName:
      readString(record.deliveredToName)
      ?? readString(record.delivered_to_name),
    failureReason:
      readString(record.failureReason)
      ?? readString(record.reason),
    status: readString(record.status) ?? 'CHEGOU',
    createdAt,
    updatedAt:
      readString(record.updatedAt)
      ?? readString(record.updated_at),
    attachmentIds: readAttachmentIds(record),
  };
}

function normalizeDeliveryEvent(raw: unknown): DeliveryEvent {
  const record = asRecord(raw) ?? {};
  const actor = asRecord(record.actor);
  const createdAt =
    readString(record.createdAt)
    ?? readString(record.created_at)
    ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `event-${createdAt}`,
    type:
      readString(record.type)
      ?? readString(record.event)
      ?? 'EVENTO',
    description:
      readString(record.description)
      ?? readString(record.reason)
      ?? readString(record.message)
      ?? 'Evento operacional registrado',
    actorName:
      readString(record.actorName)
      ?? readString(actor?.name),
    createdAt,
    attachmentIds: readAttachmentIds(record),
  };
}

function isQueueUnavailable(error: unknown) {
  const status = getHttpStatus(error);
  return status === 404 || status === 405 || status === 501;
}

export async function getDeliveries(
  instanceKey: string,
  params?: DeliveryListParams,
): Promise<DeliveriesResponse> {
  const response = await http.get(`/api/v1/${instanceKey}/deliveries`, {
    params,
    tenantKey: instanceKey,
  });

  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    dataKeys: ['data', 'items', 'deliveries'],
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map((item) => normalizeDelivery(item)),
  };
}

export async function getDeliveryById(
  instanceKey: string,
  deliveryId: string,
): Promise<DeliveryDetailResponse> {
  const response = await http.get(`/api/v1/${instanceKey}/deliveries/${deliveryId}`, {
    tenantKey: instanceKey,
  });
  const payload = asRecord(response.data);

  if (!payload) {
    return {
      delivery: null,
      events: [],
    };
  }

  const delivery = normalizeDelivery(payload.delivery ?? payload);
  const events = readArray<unknown>(
    payload.events ?? payload.history ?? payload.deliveryEvents,
  ).map((event) => normalizeDeliveryEvent(event));

  return {
    delivery,
    events,
  };
}

export async function getDeliveryQueue(
  instanceKey: string,
): Promise<DeliveryQueueResponse> {
  try {
    const response = await http.get(`/api/v1/${instanceKey}/deliveries/queue`, {
      tenantKey: instanceKey,
    });
    const payload = response.data;
    const list = Array.isArray(payload)
      ? payload
      : normalizePaginatedResponse<unknown>(payload, {
          dataKeys: ['data', 'items', 'deliveries', 'queue'],
        }).data;

    return {
      data: list.map((item) => normalizeDelivery(item)),
    };
  } catch (error) {
    if (isQueueUnavailable(error)) {
      return {
        data: [],
        unavailable: true,
      };
    }

    throw error;
  }
}

export async function createDelivery(
  instanceKey: string,
  data: CreateDeliveryRequest,
): Promise<DeliverySummary> {
  const response = await http.post(`/api/v1/${instanceKey}/deliveries`, data, {
    tenantKey: instanceKey,
  });

  return normalizeDelivery(response.data);
}

export async function assignDelivery(
  instanceKey: string,
  deliveryId: string,
  data: AssignDeliveryRequest,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/deliveries/${deliveryId}/assign`, data, {
    tenantKey: instanceKey,
  });
}

export async function completeDelivery(
  instanceKey: string,
  deliveryId: string,
  data: CompleteDeliveryRequest,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/deliveries/${deliveryId}/complete`, data, {
    tenantKey: instanceKey,
  });
}

export async function failDelivery(
  instanceKey: string,
  deliveryId: string,
  data: FailDeliveryRequest,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/deliveries/${deliveryId}/fail`, data, {
    tenantKey: instanceKey,
  });
}

export function emptyDeliveriesResponse(limit = 10) {
  return createEmptyPaginatedResponse<DeliverySummary>({
    limit,
  });
}
