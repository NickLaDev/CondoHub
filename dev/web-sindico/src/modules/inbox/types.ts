import type { PaginatedResponse } from '@/services/pagination';

export type InboxStatus = 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'ARQUIVADO';

export interface InboxUnitRef {
  id?: string;
  label?: string | null;
  blockName?: string | null;
  number?: string | null;
}

export interface InboxThread {
  id: string;
  unitId?: string | null;
  unit?: InboxUnitRef | null;
  unitLabel?: string | null;
  status: InboxStatus;
  subject?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  updatedAt: string;
  createdAt?: string;
  messages?: InboxMessage[];
}

export interface InboxMessage {
  id: string;
  threadId: string;
  sender?: string;
  authorName?: string | null;
  authorUserId?: string | null;
  body?: string;
  message?: string;
  text?: string;
  isFromAdmin?: boolean;
  attachmentIds?: string[];
  createdAt: string;
}

export interface InboxQueryParams {
  page?: number;
  limit?: number;
  unitId?: string;
  status?: InboxStatus;
  search?: string;
  threadId?: string;
}

export interface InboxThreadsResponse extends PaginatedResponse<InboxThread> {
  selectedThread?: InboxThread | null;
  messages?: InboxMessage[];
}
