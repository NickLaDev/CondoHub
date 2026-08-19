import { http } from '@/services/http';
import { normalizePaginatedResponse } from '@/services/pagination';
import type {
  AssignTicketRequest,
  CreateTicketRequest,
  ReopenTicketRequest,
  SendTicketMessageRequest,
  TicketDetailResponse,
  TicketListParams,
  TicketMessage,
  TicketStatusHistoryItem,
  TicketSummary,
  TicketsResponse,
  TicketTimelineItem,
  UpdateTicketStatusRequest,
} from '@/modules/tickets/types';

function asRecord(value: unknown) {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
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

  const singleId = readString(record.attachmentId ?? record.evidenceAttachmentId);
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

  const explicitLabel = readString(record.unitLabel);
  if (explicitLabel) {
    return explicitLabel;
  }

  const unit = asRecord(record.unit);
  if (!unit) {
    return null;
  }

  const unitLabel = readString(unit.label);
  if (unitLabel) {
    return unitLabel;
  }

  const number = readString(unit.number);
  const block = asRecord(unit.block);
  const blockName = readString(block?.name);

  if (blockName && number) {
    return `${blockName} - ${number}`;
  }

  return number;
}

function buildTicketTitle(record: Record<string, unknown>) {
  const directTitle = readString(record.title);
  if (directTitle) {
    return directTitle;
  }

  const category = readString(record.category);
  if (category) {
    return category;
  }

  const description = readString(record.description) ?? '';
  if (description.length <= 48) {
    return description || 'Ticket';
  }

  return `${description.slice(0, 45)}...`;
}

function normalizeTicket(raw: unknown): TicketSummary {
  const record = asRecord(raw) ?? {};
  const unit = asRecord(record.unit);
  const assignee =
    asRecord(record.assignee)
    ?? asRecord(record.assignedTo)
    ?? asRecord(record.assignedUser);
  const dueAt =
    readString(record.dueAt)
    ?? readString(record.due_at)
    ?? readString(record.slaDueAt)
    ?? readString(record.sla_due_at);
  const createdAt =
    readString(record.createdAt)
    ?? readString(record.created_at)
    ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `ticket-${createdAt}`,
    title: buildTicketTitle(record),
    category: readString(record.category),
    location: readString(record.location),
    description: readString(record.description) ?? '',
    status: readString(record.status) ?? 'ABERTO',
    priority: readString(record.priority) ?? 'MEDIA',
    unitId:
      readString(record.unitId)
      ?? readString(record.unit_id)
      ?? readString(unit?.id),
    unitLabel: buildUnitLabel(record),
    unit: {
      id:
        readString(record.unitId)
        ?? readString(record.unit_id)
        ?? readString(unit?.id),
      label: buildUnitLabel(record),
    },
    assignee: {
      id:
        readString(record.assignedToUserId)
        ?? readString(record.assigned_to_user_id)
        ?? readString(assignee?.id),
      name:
        readString(record.assignedToName)
        ?? readString(record.assigned_to_name)
        ?? readString(assignee?.name),
      role:
        readString(record.assignedToRole)
        ?? readString(record.assigned_to_role)
        ?? readString(assignee?.role),
    },
    dueAt,
    createdAt,
    updatedAt:
      readString(record.updatedAt)
      ?? readString(record.updated_at),
    overdue:
      readBoolean(record.overdue)
      || Boolean(dueAt && new Date(dueAt).getTime() < Date.now()),
    attachmentIds: readAttachmentIds(record),
  };
}

function normalizeTicketMessage(raw: unknown): TicketMessage {
  const record = asRecord(raw) ?? {};
  const author =
    asRecord(record.author)
    ?? asRecord(record.actor)
    ?? asRecord(record.user);
  const createdAt =
    readString(record.createdAt)
    ?? readString(record.created_at)
    ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `message-${createdAt}`,
    message:
      readString(record.message)
      ?? readString(record.body)
      ?? '',
    authorName:
      readString(record.authorName)
      ?? readString(record.actorName)
      ?? readString(author?.name),
    authorRole:
      readString(record.authorRole)
      ?? readString(record.actorRole)
      ?? readString(author?.role),
    createdAt,
    attachmentIds: readAttachmentIds(record),
  };
}

function normalizeStatusHistory(raw: unknown): TicketStatusHistoryItem {
  const record = asRecord(raw) ?? {};
  const actor = asRecord(record.actor);
  const createdAt =
    readString(record.createdAt)
    ?? readString(record.created_at)
    ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `status-${createdAt}`,
    fromStatus:
      readString(record.fromStatus)
      ?? readString(record.from_status),
    toStatus:
      readString(record.toStatus)
      ?? readString(record.to_status)
      ?? readString(record.status)
      ?? 'ABERTO',
    actorName:
      readString(record.actorName)
      ?? readString(actor?.name),
    createdAt,
    reason: readString(record.reason),
  };
}

function normalizeTimelineItem(raw: unknown): TicketTimelineItem {
  const record = asRecord(raw) ?? {};
  const createdAt =
    readString(record.createdAt)
    ?? readString(record.created_at)
    ?? new Date().toISOString();
  const type =
    readString(record.type)
    ?? (record.toStatus || record.to_status ? 'STATUS' : 'MESSAGE');

  return {
    id: readString(record.id) ?? `timeline-${createdAt}`,
    type: type === 'STATUS' ? 'STATUS' : 'MESSAGE',
    createdAt,
    actorName:
      readString(record.actorName)
      ?? readString(record.authorName),
    description:
      readString(record.description)
      ?? readString(record.message)
      ?? readString(record.body)
      ?? '',
    fromStatus:
      readString(record.fromStatus)
      ?? readString(record.from_status),
    toStatus:
      readString(record.toStatus)
      ?? readString(record.to_status),
    attachmentIds: readAttachmentIds(record),
  };
}

function buildTimeline(
  messages: TicketMessage[],
  statusHistory: TicketStatusHistoryItem[],
) {
  const messageItems: TicketTimelineItem[] = messages.map((message) => ({
    id: `message-${message.id}`,
    type: 'MESSAGE',
    createdAt: message.createdAt,
    actorName: message.authorName,
    description: message.message,
    attachmentIds: message.attachmentIds,
  }));
  const statusItems: TicketTimelineItem[] = statusHistory.map((entry) => ({
    id: `status-${entry.id}`,
    type: 'STATUS',
    createdAt: entry.createdAt,
    actorName: entry.actorName,
    description: entry.reason ?? 'Status atualizado',
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
  }));

  return [...statusItems, ...messageItems].sort((left, right) =>
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function emptyTicketDetail(): TicketDetailResponse {
  return {
    ticket: null,
    messages: [],
    statusHistory: [],
    timeline: [],
  };
}

export async function getTickets(
  instanceKey: string,
  params?: TicketListParams,
): Promise<TicketsResponse> {
  const response = await http.get(`/api/v1/${instanceKey}/tickets`, {
    params,
    tenantKey: instanceKey,
  });

  const paginated = normalizePaginatedResponse<unknown>(response.data, {
    dataKeys: ['data', 'items', 'tickets'],
    defaultLimit: params?.limit,
  });

  return {
    ...paginated,
    data: paginated.data.map((item) => normalizeTicket(item)),
  };
}

export async function getTicketById(
  instanceKey: string,
  ticketId: string,
): Promise<TicketDetailResponse> {
  const response = await http.get(`/api/v1/${instanceKey}/tickets/${ticketId}`, {
    tenantKey: instanceKey,
  });
  const payload = asRecord(response.data);

  if (!payload) {
    return emptyTicketDetail();
  }

  const ticket = normalizeTicket(payload.ticket ?? payload);
  const messages = readArray<unknown>(payload.messages).map((item) =>
    normalizeTicketMessage(item),
  );
  const statusHistory = readArray<unknown>(
    payload.statusHistory ?? payload.status_history ?? payload.history,
  ).map((item) => normalizeStatusHistory(item));
  const explicitTimeline = readArray<unknown>(payload.timeline).map((item) =>
    normalizeTimelineItem(item),
  );

  return {
    ticket,
    messages,
    statusHistory,
    timeline:
      explicitTimeline.length > 0
        ? explicitTimeline.sort((left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          )
        : buildTimeline(messages, statusHistory),
  };
}

export async function createTicket(
  instanceKey: string,
  data: CreateTicketRequest,
): Promise<TicketSummary> {
  const response = await http.post(`/api/v1/${instanceKey}/tickets`, data, {
    tenantKey: instanceKey,
  });

  return normalizeTicket(response.data);
}

export async function sendTicketMessage(
  instanceKey: string,
  ticketId: string,
  data: SendTicketMessageRequest,
): Promise<TicketMessage> {
  const response = await http.post(
    `/api/v1/${instanceKey}/tickets/${ticketId}/messages`,
    data,
    {
      tenantKey: instanceKey,
    },
  );

  return normalizeTicketMessage(response.data);
}

export async function assignTicket(
  instanceKey: string,
  ticketId: string,
  data: AssignTicketRequest,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/tickets/${ticketId}/assign`, data, {
    tenantKey: instanceKey,
  });
}

export async function updateTicketStatus(
  instanceKey: string,
  ticketId: string,
  data: UpdateTicketStatusRequest,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/tickets/${ticketId}/status`, data, {
    tenantKey: instanceKey,
  });
}

export async function reopenTicket(
  instanceKey: string,
  ticketId: string,
  data: ReopenTicketRequest,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/tickets/${ticketId}/reopen`, data, {
    tenantKey: instanceKey,
  });
}
