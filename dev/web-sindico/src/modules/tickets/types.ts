import type { PaginatedResponse } from '@/services/pagination';

export type TicketStatus =
  | 'ABERTO'
  | 'EM_ANDAMENTO'
  | 'PENDENTE'
  | 'RESOLVIDO'
  | 'FECHADO'
  | 'REABERTO'
  | string;

export type TicketPriority =
  | 'BAIXA'
  | 'MEDIA'
  | 'ALTA'
  | 'CRITICA'
  | string;

export interface TicketUnitRef {
  id: string | null;
  label: string | null;
}

export interface TicketAssigneeRef {
  id: string | null;
  name: string | null;
  role: string | null;
}

export interface TicketSummary {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  unitId: string | null;
  unitLabel: string | null;
  unit: TicketUnitRef | null;
  assignee: TicketAssigneeRef | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  overdue: boolean;
  attachmentIds: string[];
}

export interface TicketMessage {
  id: string;
  message: string;
  authorName: string | null;
  authorRole: string | null;
  createdAt: string;
  attachmentIds: string[];
}

export interface TicketStatusHistoryItem {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  actorName: string | null;
  createdAt: string;
  reason: string | null;
}

export interface TicketTimelineItem {
  id: string;
  type: 'MESSAGE' | 'STATUS';
  createdAt: string;
  actorName: string | null;
  description: string;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  attachmentIds?: string[];
}

export type TicketsResponse = PaginatedResponse<TicketSummary>;

export interface TicketDetailResponse {
  ticket: TicketSummary | null;
  messages: TicketMessage[];
  statusHistory: TicketStatusHistoryItem[];
  timeline: TicketTimelineItem[];
}

export interface TicketListParams {
  page?: number;
  limit?: number;
  status?: string;
  unitId?: string;
  assignedTo?: string;
  overdue?: boolean;
  search?: string;
}

export interface CreateTicketRequest {
  unitId?: string;
  category?: string;
  location?: string;
  description: string;
  attachmentIds?: string[];
}

export interface SendTicketMessageRequest {
  message: string;
  attachmentId?: string;
}

export interface AssignTicketRequest {
  userId: string;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
}

export interface ReopenTicketRequest {
  reason?: string;
}
