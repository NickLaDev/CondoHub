import { http } from '@/services/http';
import {
  createEmptyPaginatedResponse,
  normalizePaginatedResponse,
} from '@/services/pagination';
import type {
  InboxMessage,
  InboxQueryParams,
  InboxStatus,
  InboxThread,
  InboxThreadsResponse,
} from '@/modules/inbox/types';

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
  return typeof value === 'boolean' ? value : undefined;
}

function readArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeInboxStatus(value: unknown): InboxStatus {
  const status = readString(value);

  if (
    status === 'ABERTO'
    || status === 'EM_ATENDIMENTO'
    || status === 'RESOLVIDO'
    || status === 'ARQUIVADO'
  ) {
    return status;
  }

  return 'ABERTO';
}

function normalizeInboxMessage(raw: unknown): InboxMessage {
  const record = asRecord(raw) ?? {};
  const createdAt = readString(record.createdAt) ?? readString(record.created_at) ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `message-${createdAt}`,
    threadId: readString(record.threadId) ?? readString(record.thread_id) ?? '',
    sender: readString(record.sender) ?? undefined,
    authorName: readString(record.authorName) ?? readString(record.author_name),
    authorUserId: readString(record.authorUserId) ?? readString(record.author_user_id),
    body: readString(record.body) ?? readString(record.message) ?? readString(record.text) ?? '',
    message: readString(record.message) ?? undefined,
    text: readString(record.text) ?? undefined,
    isFromAdmin: readBoolean(record.isFromAdmin),
    attachmentIds: readArray<string>(record.attachmentIds ?? record.attachment_ids).filter(Boolean),
    createdAt,
  };
}

function normalizeInboxThread(raw: unknown): InboxThread | null {
  const record = asRecord(raw);

  if (!record) {
    return null;
  }

  const unit = asRecord(record.unit);
  const unitId = readString(record.unitId) ?? readString(record.unit_id) ?? readString(unit?.id);
  const updatedAt = readString(record.updatedAt) ?? readString(record.updated_at) ?? new Date().toISOString();

  return {
    id: readString(record.id) ?? `thread-${unitId ?? updatedAt}`,
    unitId,
    unit: unit
      ? {
          id: readString(unit.id) ?? undefined,
          label: readString(unit.label),
          blockName: readString(unit.blockName) ?? readString(unit.block_name),
          number: readString(unit.number),
        }
      : null,
    unitLabel: readString(record.unitLabel) ?? readString(record.unit_label),
    status: normalizeInboxStatus(record.status),
    subject: readString(record.subject),
    lastMessage: readString(record.lastMessage) ?? readString(record.last_message),
    lastMessageAt: readString(record.lastMessageAt) ?? readString(record.last_message_at),
    updatedAt,
    createdAt: readString(record.createdAt) ?? readString(record.created_at) ?? undefined,
    messages: readArray<unknown>(record.messages).map(normalizeInboxMessage),
  };
}

export async function getInboxThreads(
  instanceKey: string,
  params?: InboxQueryParams,
): Promise<InboxThreadsResponse> {
  const response = await http.get(`/api/v1/${instanceKey}/unit/inbox`, {
    params,
    tenantKey: instanceKey,
  });

  const paginated = normalizePaginatedResponse<InboxThread>(response.data, {
    dataKeys: ['data', 'items', 'threads'],
    defaultLimit: params?.limit,
  });
  const payload = response.data as Record<string, unknown> | null;
  const threads = paginated.data
    .map(normalizeInboxThread)
    .filter((thread): thread is InboxThread => Boolean(thread));
  const selectedThread =
    normalizeInboxThread(payload?.selectedThread ?? payload?.thread)
    ?? threads.find((thread) => thread.id === params?.threadId)
    ?? null;
  const selectedMessages = readArray<unknown>(payload?.messages).map(normalizeInboxMessage);
  const messages =
    selectedMessages.length > 0
      ? selectedMessages
      : selectedThread?.messages ?? [];

  return {
    ...paginated,
    data: threads,
    selectedThread,
    messages,
  };
}

export async function postInboxMessage(
  instanceKey: string,
  threadId: string,
  data: { message: string; attachmentIds?: string[] },
): Promise<InboxMessage> {
  const response = await http.post<InboxMessage>(
    `/api/v1/${instanceKey}/unit/inbox/messages`,
    {
      threadId,
      body: data.message,
      message: data.message,
      attachmentIds: data.attachmentIds,
    },
    {
      tenantKey: instanceKey,
    },
  );
  return normalizeInboxMessage(response.data);
}

export async function updateInboxStatus(
  instanceKey: string,
  threadId: string,
  status: InboxStatus,
): Promise<void> {
  await http.post(`/api/v1/${instanceKey}/unit/inbox/status`, { threadId, status }, { tenantKey: instanceKey });
}

export function emptyInboxThreadsResponse(limit = 10) {
  return createEmptyPaginatedResponse<InboxThread>({
    limit,
  });
}
